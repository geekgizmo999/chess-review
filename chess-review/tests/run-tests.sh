#!/usr/bin/env sh
set -eu
node --experimental-default-type=module --test tests/review.test.mjs
