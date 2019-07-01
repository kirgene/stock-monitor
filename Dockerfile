FROM node:alpine as build

RUN apk --update --no-cache add python build-base

WORKDIR /app

COPY . .
RUN npm install \
 && npm run build \
 && npm prune --production

####################################################

FROM node:12.5-alpine

WORKDIR /app

COPY --from=build /app/db db
COPY --from=build /app/package.json .
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/public public

ENV PORT 80

EXPOSE 80

CMD ["npm", "run", "migrate-and-start"]

