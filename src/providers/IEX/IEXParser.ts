import {Parser as BinaryParser} from 'binary-parser';
import { Writable } from 'stream';
import {IEXStockPrice} from './Common';
import * as decoders from 'cap-decoders';

type Callback = (prices: IEXStockPrice[]) => Promise<void>;

enum MessageType {
  SystemEvent = 0x53,
  SecurityDirector = 0x44,
  TradingStatus = 0x48,
  OperationalHaltStatus = 0x4f,
  ShortSalePriceTestStatus = 0x50,
  QuoteUpdate = 0x51,
  TradeReport = 0x54,
  OfficialPrice = 0x58,
  TradeBreak = 0x42,
  AuctionInformation = 0x41,
}

export class IEXParser extends Writable {
  private static readonly SUPPORTED_PROTOCOLS = ['IEXTP1'];
  private static readonly SUPPORTED_VERSIONS = ['1.6'];
  private static readonly SUPPORTED_FEED = ['TOPS'];
  private static readonly CACHE_SIZE = 5000;
  private parser: BinaryParser;
  private callback: Callback;
  private cache: IEXStockPrice[] = [];

  public static isSupported(feed: string, protocol: string, version: string) {
    return IEXParser.SUPPORTED_FEED.includes(feed) &&
      IEXParser.SUPPORTED_PROTOCOLS.includes(protocol) &&
      IEXParser.SUPPORTED_VERSIONS.includes(version);
  }

  private static getPacketPayload(packet: Buffer) {
    let result;
    const PROTOCOL = decoders.PROTOCOL;
    let ret = decoders.Ethernet(packet);
    if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
      ret = decoders.IPV4(packet, ret.offset);
      if (ret.info.protocol === PROTOCOL.IP.UDP) {
        ret = decoders.UDP(packet, ret.offset);
        result = packet.slice(ret.offset);
        // console.log(data.toString('hex').match(/../g).join(' '))
        // console.log('===============================');
      }
    }
    return result;
  }

  private static createDataParser() {
    // As appear in https://iextrading.com/docs/IEX%20TOPS%20Specification.pdf
    // (do not change the order)
    const SystemEventMessage = new BinaryParser().skip(10);
    const SecurityDirectorMessage = new BinaryParser().skip(31);
    const TradingStatusMessage = new BinaryParser().skip(22);
    const OperationalHaltStatusMessage = new BinaryParser().skip(18);
    const ShortSalePriceTestStatusMessage = new BinaryParser().skip(19);
    const QuoteUpdateMessage = new BinaryParser().skip(42);
    const TradeReportMessage = new BinaryParser()
      .endianess('little')
      .uint8('messageType')
      .uint8('flags')
      // @ts-ignore: uint64 doesn't exists
      .uint64('timestamp')
      .string('symbol', {
        length: 8,
        formatter: (symbol) => symbol.trim(),
      })
      .uint32('size')
      .uint64('price')
      .skip(8);
    const OfficialPriceMessage = new BinaryParser()
      .endianess('little')
      .uint8('messageType')
      .uint8('priceType')
      // @ts-ignore: uint64 doesn't exists
      .uint64('timestamp')
      .string('symbol', {
        length: 8,
        formatter: (symbol) => symbol.trim(),
      })
      .uint64('price');
    const TradeBreakMessage = new BinaryParser().skip(38);
    const AuctionInformationMessage = new BinaryParser().skip(80);

    const Message = new BinaryParser()
      .endianess('little')
      .uint16('size')
      .uint8('messageType')
      // Move offset before 'type' (1 byte) as 'type' is already in messages
      .skip(-1) // .seek(-1)
      .choice('data', {
        tag: 'messageType',
        choices: {
          [MessageType.SystemEvent]: SystemEventMessage,
          [MessageType.SecurityDirector]: SecurityDirectorMessage,
          [MessageType.TradingStatus]: TradingStatusMessage,
          [MessageType.OperationalHaltStatus]: OperationalHaltStatusMessage,
          [MessageType.ShortSalePriceTestStatus]: ShortSalePriceTestStatusMessage,
          [MessageType.QuoteUpdate]: QuoteUpdateMessage,
          [MessageType.TradeReport]: TradeReportMessage,
          [MessageType.OfficialPrice]: OfficialPriceMessage,
          [MessageType.TradeBreak]: TradeBreakMessage,
          [MessageType.AuctionInformation]: AuctionInformationMessage,
        },
      });

    const Header = new BinaryParser()
      .endianess('little')
      .uint8('version', { assert: 0x01 })
      .uint8('reserved')
      .uint16('protocol', { assert: 0x8003 })
      .uint32('channel', { assert: 0x01 })
      .uint32('session')
      .uint16('payloadLength')
      .uint16('messageCount')
      // @ts-ignore: uint64 doesn't exists
      .uint64('offset')
      .uint64('seq')
      .uint64('timestamp')
      .array('messages', {
        type: Message,
        length: 'messageCount',
      });

    return Header;
  }

  public constructor(callback: Callback) {
    super({objectMode: true});
    this.callback = callback;
    this.parser = IEXParser.createDataParser();
  }

  public _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    let result;
    try {
      const payload = IEXParser.getPacketPayload(chunk.data);
      if (!payload) {
        callback(new Error('Failed to parse IEX packet'));
      } else {
        result = this.parser.parse(payload) as any;
      }
    } catch (e) {
      callback(e);
    }
    if (result) {
      const stockPrices: IEXStockPrice[] = result.messages
        .filter((msg: any) => msg.messageType === MessageType.TradeReport)
        .map(({data}) => ({
          symbol: data.symbol,
          price: data.price,
          // @ts-ignore: bigint in esnext
          time: Number(data.timestamp / 1000000n), // nsec -> msec
          size: data.size,
        }));
      this.cache.push(...stockPrices);
      if (this.cache.length > IEXParser.CACHE_SIZE) {
        this.callback(this.cache)
          .then(() => this.cache = [])
          .then(() => callback());
      } else {
        callback();
      }
    }
  }

  public _final(callback: (error?: Error | null) => void): void {
    this.callback(this.cache)
      .then(() => this.cache = [])
      .then(() => callback());
  }
}
