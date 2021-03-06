import { BINDCONFIG } from '../src/types';

export const SAMPLE1OBJ: BINDCONFIG = {
  options: {
    directory: '/var/bind',
    dnssec: true,
    dnssecValidation: true,
    recursion: true,
    pidFile: '/var/run/named/named.pid',
    listenOn: ['any'],
    alsoNotify: ['1.1.1.1', '1.0.0.1'],
    allowTransfer: ['none'],
    allowRecursion: ['none'],
  },
  zones: [{ name: 'example.com', type: 'master', file: '/zones/example.com', autoDNSSEC: 'maintain' }],
  keys: [
    {
      algorithm: 'hmac-sha256',
      name: 'hello-world',
      secret: 'HELLO-WORLD',
    },
  ],
};

export const SAMPLE1TXT = `
options {
  directory "/var/bind";
  also-notify { 
    1.1.1.1; 
    1.0.0.1; 
  };
  listen-on { any; };
  listen-on-v6 { none; };

  allow-transfer {
    none;
  };

  pid-file "/var/run/named/named.pid";

  allow-recursion { none; };
  recursion yes;
  dnssec-enable yes;
  dnssec-validation yes;
};

zone "example.com" {
    type master;
    auto-dnssec maintain;
    file "/zones/example.com";
};

key "hello-world" {
  algorithm hmac-sha256;
  secret "HELLO-WORLD";
};

`;

export const SAMPLE2OBJ: BINDCONFIG = {
  include: ['/etc/rndc.key', '/etc/rndc2.key'],
  controls: {
    inet: {
      allow: 'localhost',
      keys: 'rndc-key',
      source: '127.0.0.1',
    },
  },
  options: {
    directory: '/var/stuff/bind',
    pidFile: '/var/run/named/named.pid',
    listenOn: ['any'],
    allowTransfer: ['none'],
    allowRecursion: ['none'],
    recursion: false,
    dnssec: false,
    dnssecValidation: false
  },
  zones: [

    { name: 'tst.example.com', type: 'master', file: '/zones/tst.example.com', notify: true, inlineSigning: true, keyDirectory: '/etc/bind/keys', allowTransfer: ['192.168.255.16'], alsoNotify: ['192.168.255.16', '10.20.0.170'], autoDNSSEC: 'maintain' },
  ],
  keys: [
    {
      algorithm: 'hmac-sha256',
      name: 'hello-world',
      secret: 'HELLO-WORLD',
    },
    { algorithm: 'hmac-sha256', name: 'tst2', secret: 'HELLO-KEY' },
  ],
};

export const SAMPLE2TXT = `
include "/etc/rndc.key";
include "/etc/rndc2.key";

controls {
  inet 127.0.0.1 allow { localhost; } keys { "rndc-key"; };
};


options {
  directory "/var/stuff/bind";

  listen-on { any; };
  listen-on-v6 { none; };

  allow-transfer {
    none;
  };

  pid-file "/var/run/named/named.pid";

  allow-recursion { none; };
  recursion no;
  dnssec-enable no;
  dnssec-validation no;
};

zone "tst.example.com" {
  type master;
  file "/zones/tst.example.com";
  allow-transfer { 192.168.255.16; };
  also-notify { 
    192.168.255.16;
    10.20.0.170;
  };
  notify yes;
  inline-signing yes;
  key-directory "/etc/bind/keys";
  auto-dnssec maintain;
};

key "hello-world" {
  algorithm hmac-sha256;
  secret "HELLO-WORLD";
};

key "tst2" {
  algorithm hmac-sha256;
  secret "HELLO-KEY";
};

`;


export const SAMPLE3OBJ: BINDCONFIG = {
  include: ['/etc/rndc.key', '/etc/rndc2.key'],
  controls: {
    inet: {
      allow: 'localhost',
      keys: 'rndc-key',
      source: '127.0.0.1',
    },
  },
  options: {
  },
  zones: [
    {
      name: 'example.com',
      type: 'master',
      file: '/zones/example.com',
      inlineSigning: false,
      updatePolicy: {
        grant: 'hello-world',
        zonesub: 'ANY',
      },
      notify: false
    },
    { name: 'tst.example.com', type: 'master', file: '/zones/tst.example.com', notify: true, inlineSigning: true, keyDirectory: '/etc/bind/keys', allowTransfer: ['192.168.255.16'], alsoNotify: ['192.168.255.16'], autoDNSSEC: 'maintain' },
  ]
};

export const SAMPLE3TXT = `
include "/etc/rndc.key";
include "/etc/rndc2.key";

controls {
  inet 127.0.0.1 allow { localhost; } keys { "rndc-key"; };
};


options {
  listen-on-v6 { none; };


};

zone "example.com" {
  type master;
  notify no;
  inline-signing no;
  update-policy { grant hello-world zonesub ANY; };
  file "/zones/example.com";
};

zone "tst.example.com" {
  type master;
  file "/zones/tst.example.com";
  allow-transfer { 192.168.255.16; };
  also-notify { 
    192.168.255.16; 
  };
  notify yes;
  inline-signing yes;
  key-directory "/etc/bind/keys";
  auto-dnssec maintain;
};

`;
