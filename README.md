ion-http
========

Control an ION lamp from your browser!


## Getting Started

First off, make sure you're using a Bluetooth 4.0 compatible adapter with your computing device of choice (Linux is the only tested platform). If you're looking for recommendations, we've tested with this guy extensively: http://www.iogear.com/product/GBU521/ You'll also need to ensure that your user has permission to interact with the Bluetooth adapter. If you're lazy, you can simply use sudo when you launch the server.

## Installation

Once you've got Node.js up and running, it's as simple as...

```
git clone git@github.com:lavallc/ion-http.git
cd ion-http
sudo ./erupt
```

Then just browse to http://localhost:3000

If you're setting Node.js up on your Raspberry Pi, we recommend following the guide here:

https://learn.adafruit.com/raspberry-pi-hosting-node-red/setting-up-node-dot-js

## Additional Configuration

If you have renamed your ION (from the default name of 'ion'), you'll need to update config.js. In this file you will also find that you can set your latitude/longitude for providing ION with relevant weather data.