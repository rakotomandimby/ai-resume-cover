#!/bin/bash

PATH="./node_modules/.bin:"${PATH}
rm -rfv dist \
    && tsc \
    && node dist/index.js

