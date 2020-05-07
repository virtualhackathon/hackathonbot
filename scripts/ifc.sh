#!/bin/bash

SCRIPTSDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"
BASEDIR="$SCRIPTSDIR/.."

# This assumes that hsd and bcoin are
# running on localhost on regtest

$BASEDIR/bin/event-daemon \
    --bot-nick BOT_NICK \
    --irc-uri irc.imperialfamily.com \
    --irc-channel '#hackathon' \
    --irc-admin-channel '#hackathon-admin' \
    --log-level debug \
    --irc-port 6667 \
    --log-level spam \
    --hsd-url "127.0.0.1" \
    --hsd-network regtest \
    --bcoin-url "127.0.0.1" \
    --bcoin-network regtest
