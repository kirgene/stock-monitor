# Stock Monitor

This project demonstrates some aspects of working with real-time time series (stock tickers) data.

There are two ways to run server: as a Docker container (simplest) or locally in current environment.

### Features
- Fetch ticker prices from third-party service in realtime
- Cache requested data
- Execute queries on cached data 
- Supported data providers: IEX 
 

### Running as Docker container (on Ubuntu Linux)

##### Requirements

- [Docker >= 18.03](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
    ```bash
    sudo su
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    apt update
    apt install -y docker-ce
    curl -L "https://github.com/docker/compose/releases/download/1.23.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    usermod -aG docker $USER
    ```

##### Clone repository
```bash
git clone https://github.com/kirgene/stock-monitor.git
cd stock-monitor
```

##### Build and run Docker image
```bash
docker-compose up -d
```
> Note: if you receive error like `Couldn't connect to Docker daemon` try to reboot your system.

##### Access server:
```bash
http://localhost:8000
```

### Running Locally (on Ubuntu Linux)

##### Requirements

- [Node.js >= 12.5](http://nodejs.org/)
- [PostgreSQL >= 11](https://www.postgresql.org/)
- `build-essentials` package

##### Setup PostgreSQL database:
```sql
CREATE DATABASE stock_db;
CREATE USER stock_admin WITH PASSWORD 'stock_pass';
GRANT ALL PRIVILEGES ON DATABASE stock_db TO stock_admin;
``` 

##### Setup server:
```bash
git clone https://github.com/kirgene/stock-monitor.git
cd stock-monitor
npm install
```

##### Configurations
> Copy `.env.example` template to `.env` and modify according to your environment 
```bash
cp .env.example .env
```

##### Prepare database
```bash
npm run migrate
```


##### Run server
+ Development mode:
```bash
    npm run start-dev
```

+ Production mode:
```bash
    npm run build
    npm start
```

##### Access server:
```bash
http://localhost:8000
```

---

## API Description

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{ data: [{...}, {...}, ...] }`
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:** `{ errors : ["...", "....", ...] }`
------

***List Stocks***
----
  Return available stocks.

* **URL**

  /stocks

* **Method:**

  `GET`
  
* **URL Params**

  Field | Required |Data Type | Description | Examples
  --- | --- | --- | --- | ---
  name |  | JSON string array | Case insensitive filter on stock symbols and company names with wildcard `*` matching support | `["ab*","f*p"]`, `["abc"]`
   
 

* **Response:**

  Object key | Value Type | Description | Examples
  --- | --- | --- | ---
  id |  integer | Item ID | `23`, `35`
  name |  string | Company name | `Intel Corporation`, `Alphabet Inc.`
  symbol |  string | Stock symbol | `INTC`, `GOOG`
 
------

***List Stocks Prices***
----
  Return stock prices using different filters.

* **URL**

  /prices

* **Method:**

  `GET`
  
* **URL Params**

  Field | Data Type | Description | Examples
  --- |  --- | --- | ---
  name |  JSON string array | Case insensitive filter on stock symbols and company names with wildcard `*` matching support | `["ab*","f*p"]`, `["abc"]`
  start |  ISO 8601 date | Start datetime | `2019-06-27T14:00:00`, `2019-06-27T16:00:00`
  end |  ISO 8601 date | End datetime | `2019-06-27T14:00:00`, `2019-06-27T16:00:00`
  high |  float | List stocks with prices below this value (high water mark) | `150.40`, `600`
  low |  float | List stocks with prices above this value (low water mark) | `10.25`, `50`
   
 > NOTICE: specifying `start` and `end` params on a fresh database will lead to downloading historical data for a given time range and the amount of that data can be HUGE ( ~ 700 - 900 MB for a single day).<br>
 The progress and estimated completion time of this processing are displayed in real-time in logs.

* **Response:**

  Object key | Value Type | Description | Examples
  --- | --- | --- | ---
  id |  integer | Item ID | `23`, `35`
  name |  string | Company name | `Intel Corporation`, `Alphabet Inc.`
  symbol |  string | Stock symbol | `INTC`, `GOOG`
  price |  float | Stock price | `150.40`, `600`
  time |  ISO 8601 | Timestamp | `2019-06-26T15:33:46.812Z`

 -----

***Get Latest Stocks Prices***
----
  Subscribe for latest stocks prices

* **URL**

  /latest-prices

* **Method:**

  `WebSocket (ws://)`
  
* **Request Message**

  Object Key | Data Type | Description | Examples
  --- |  --- | --- | ---
  type |  string | Use `subscribe`/`unsubscribe` to subscribe/unsubscribe for/from a given stock | `["ab*","f*p"]`, `["abc"]`
  name |  JSON string array | Case insensitive filter on stock symbols and company names with wildcard `*` matching support | `["ab*","f*p"]`, `["abc"]`
   
 

* **Response:**

  Refer to `Response` section of `List Stocks Prices` API.

* **Demo:**
`http://localhost:8000/demo/?name=["intel*"]`
 -----
