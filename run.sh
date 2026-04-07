#!/bin/bash

PATH="./node_modules/.bin:"${PATH}
npm install
rm -rfv dist \
    && tsc \
    && node dist/index.js

