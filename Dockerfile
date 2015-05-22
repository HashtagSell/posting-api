FROM hashtagsell/ubuntu-node-hashtagsell:v0.12
MAINTAINER Joshua Thomas <joshua.thomas@hashtagsell.com>

# NPM install
ADD package.json /tmp/package.json
RUN cd /tmp && \
	npm install && \
	mkdir -p /home/hashtagsell/posting-api && \
	cp -a /tmp/node_modules /home/hashtagsell/posting-api && \
	rm -rf /tmp/node_modules

WORKDIR /home/hashtagsell/posting-api
COPY . /home/hashtagsell/posting-api

EXPOSE 8880
CMD ["npm", "start"]
