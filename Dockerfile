# filepath: /Users/cuongdm/Documents/repo/projects/LangchainDemo1/bot/Dockerfile
FROM node:18 AS BUILD_IMAGE

RUN curl -sfL https://gobinaries.com/tj/node-prune | bash -s -- -b /usr/local/bin

WORKDIR /app

COPY . /app/

# install with legacy-peer-deps
RUN npm install --legacy-peer-deps

# build
RUN npm run build

# remove development dependencies
RUN npm prune --production  --legacy-peer-deps

# run node prune
RUN /usr/local/bin/node-prune

FROM node:18-alpine

WORKDIR /app

# copy from build image
COPY --from=BUILD_IMAGE /app/dist ./dist
COPY --from=BUILD_IMAGE /app/node_modules ./node_modules
COPY certs /app/certs

ENV DEBUG msteams

EXPOSE 3007

CMD [ "node", "dist/server.js" ]