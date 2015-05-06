FROM hashtagsell/ubuntu-node-hashtagsell:v0.12
MAINTAINER Joshua Thomas <joshua.thomas@hashtagsell.com>

# NPM install
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /home/hashtagsell/posting-api && \
	cp -a /tmp/node_modules /home/hashtagsell/posting-api

RUN mkdir -p /home/hashtagsell/posting-api
WORKDIR /home/hashtagsell/posting-api
COPY . /home/hashtagsell/posting-api

EXPOSE 8880
CMD ["supervisor", "server"]
