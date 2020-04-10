#!/bin/bash

TESTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

BASEDIR="$TESTDIR/.."

NICK=william
SERVER="irc.freenode.net"
EVENT="hackathon0"
LINK="irc://irc.freenode.net:+6697/IFC"
ADDRESS="bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej"

echo "newevent"
$BASEDIR/bin/cli newevent \
    --admin true \
    --name $EVENT \
    --start $(date +"%s") \
    --end $(date +"%s") \
    --link $LINK \
    --message "Thank you for participate"

sleep 0.2
echo

echo "eventinfo"
$BASEDIR/bin/cli eventinfo $EVENT

sleep 0.2
echo

echo "createuser"
$BASEDIR/bin/cli createuser \
    --nick $NICK \
    --server $SERVER \
    --link "https://nam.ek"

sleep 0.2
echo

echo "user"
$BASEDIR/bin/cli user $NICK $SERVER

sleep 0.2
echo

echo "register"
$BASEDIR/bin/cli register \
    --nick $NICK \
    --server $SERVER \
    --event $EVENT

sleep 0.2
echo

echo "eventinfo"
$BASEDIR/bin/cli eventinfo $EVENT

echo "newaddress"
$BASEDIR/bin/cli newaddress \
    --nick $NICK \
    --server "$SERVER" \
    --event $EVENT \
    --address $ADDRESS

sleep 0.2
echo

echo "address"
$BASEDIR/bin/cli address $ADDRESS
