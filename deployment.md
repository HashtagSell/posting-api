# Deployment to AWS

|Environment|Stack|Layer|EC2|
|-----------|-----|-----|---|
|stage|mongo|data|ec2-54-69-251-189.us-west-2.compute.amazonaws.com|
|stage|node|API|ec2-54-69-133-93.us-west-2.compute.amazonaws.com|

hashtagsell-deploy
#Sell2014


## Setup

### Prerequisites

* Ubuntu 14.04LTS x64 Server
* Primary volume sized to 16G
* For Mongo - secondary volume sized to 1T
* Add to appropriate security group (`stage-hashtagsell-data` or `stage-hashtagsell-api`)

### Basic Server Setup Steps

```bash
sudo apt-get update && sudo apt-get dist-upgrade -y
# note: when the grub menu prompt appears, choose the "keep" option
sudo apt-get install build-essential git -y
```

### MongoDB Server

After completing the above basic server setup steps, do the following steps to complete setup of MongoDB:

#### Prepare Secondary Volume

Run the following command and make note of the 1T (or large) volume that exists on the server:

```bash
lsblk
```

The above will produce something similar to:

```bash
ubuntu@ip-172-31-4-65:/$ lsblk
NAME    MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
xvda    202:0    0  16G  0 disk
└─xvda1 202:1    0  16G  0 part /
xvdb    202:16   0   1T  0 disk
```

Prepare the appropriate volume's (in the above example, xvdb) filesystem:

```bash
sudo mkfs -t ext4 /dev/xvdb
```

Now create a folder for the volume and mount it:

```bash
sudo mkdir /data
sudo mount /dev/xvdb /data
```

To ensure the drive will exist after a reboot, make a copy of the `/etc/fstab` file and then edit it:

```bash
sudo cp /etc/fstab /etc/fstab.orig
```

Now add the following line to the file:

```
/dev/xvdb 	/data 	 ext4 	defaults,nofail 	0 2
```

Now verify the mount is properly configured:

```bash
sudo mount -a
```

Ensure mongo has permissions to the mount folder:

```bash
sudo chown -R mongodb:mongodb /data
```

#### Install and Configure Mongo

```bash
sudo apt-get install mongodb -y
```

Now edit `/etc/mongodb.conf` and ensure the following values are set:

```
# mongodb.conf

# Where to store the data.
dbpath=/data

# Where to log
logpath=/var/log/mongodb/mongodb.log
logappend=true

# bind_ip = 127.0.0.1
port = 27017

# Enable journaling, http://www.mongodb.org/display/DOCS/Journaling
journal=true

# Disable the HTTP interface (Defaults to localhost:27018).
nohttpinterface = true
```

Now stop and start mongo:

```bash
sudo service mongodb stop
sudo service mongodb start
```

### API Server

After completing the above basic server setup steps, do the following steps to complete setup of the API server:

#### Compile and Install Node

Do the following... grab a coffee, it will take a while:

```bash
mkdir ~/source
cd ~/source
git clone https://github.com/joyent/node.git
cd node
git checkout v0.10.35
./configure && make && sudo make install
```

#### SSH Deployment Key

In order to access HashtagSell code in GitHub, the SSH deployment key must be added to the server. Create a file at `~/.ssh/id_rsa` with the following contents:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAvHpHPmezLVsvBM/MyrXGSoUeurQ7GatIv+Hw5jFH21AjTM96
QuzJ8rXA1LQwuiRtFsviEMK3ZPgH06lyVs1QU2uz7Eudnlf2C2B+zNw7t7ZVxvll
YgySlKlllCW/Y7rFf6TGDbXSuseUGHNaZ4/WwySlyO73i76JexfFJvijazLMTkM0
+RSe5mDVl32L6wPnPCtsCzTO4TGT68UdVHwYuVyXb68THTPZpVm+HL+Y3KE+RYdL
Oqpz4c67X71Cthh8ktOO4iYl4CAJhRYS4eHXZ1Oh4oZyDVMMX+053aail1VgTV0W
q7g3Tm0Lclnse1oWibbJVpdHT4Ek9Uph+xejMwIDAQABAoIBAGv4RG3MbAlUjffc
rn2FaiVwYu0jqCOJSrCZVy4XFwncu4wZ4vkJuppuYhu3aZ6IlXGUtFlTokmWCK3J
CPYOwbA4J6b6nj2CODHGQn1KwG76ZeMJJXnop+O/srAOe7g+2zrHAqoB+ckD4aOs
GSLwdF/v04Tq2CZWrV01fbxYfQ0/3aHVzHdKXJZD2Ucd2BInEqR90l+HY1riTNKm
7daDFr3P+PqMRoxzauPYp2d0z/5Lb+QLCuK3ghm2FqQ4UUZNKZsppEknJWQAajt5
D/86r4U6lH4dh8J3kBGwJHITROaqXjCdM53nQzhQUOHdROtMKqgA/+jhNdpjxh0Q
ctJH+skCgYEA4h51XhzWI4gMR9vPmVenp4ls8sLJAgIqOBKi1f2jx+LwLCjj48g4
8/47O/F7gRgO9cwh6MJ+6wStniTTydVV7OaKOYyLNhYd8hi1MSgnpAUhYUQ5+Cgg
2juoBedtnCI91iLivzmeYUEv7V4AsJWQ94ZUw42ZXggyrqi9WkqUtJUCgYEA1WJs
m3exy9jZLvAPoFOjIdPr3+P5ajbZ3YzAOGVpGUBCw54z6HjsJUVXCrV4CuZj1PPs
oxDlWzXJZqPFw+wHUPiyX+eutSce8MEifG+0P+PSaJluD1EU6X3xjGaZbGZMzz2w
1FUKMV9jeODGzrlW/NKFeXC/kX7T/f7FczDC/qcCgYEAz5rdcZISPb8sX1F+sjBb
eqPfRqf2O4TXVHIv1T8x/1Tp4/GLAliTidlScz/MgAMhwSUxwO3J72d1LCxt0vKv
GHm2UQ4rxnXZ+qwat85BTwNy2UX131SgjR2WsA0CgwahNZkEDEQPmQVrxoi3I2m/
FrPb4UuBk2b9eYTtjRfKnl0CgYADAVbcPaxQXaZ5ZcIilOr4P/7TcWeC2nDpEOFo
Ke14AJKwJJtAi+tvfvGB4hpltOb1CdZsWYGRbkl+25Ged8WGm2oPtbidLobeBypQ
LFaSi8fb10VYi+DKhQ6Q1qUUhMBSLuE9rFDvbxN8kVXbdXrHJsPgePkJuIqNyjfH
rokggwKBgDkbHOvolfZ4wKiwWs9T8Z/XQLbR7fKj64myMdcHJsT4t9Vs0HvDmRBM
WazhvaDgwdGn0ryW8hhPNG4e/Ek0cCG+Lo3F/cMKrLDb0F7WUwcqxOidXlmZRbAO
vbsdTgfd0jtYBWbgPGQUZOxoJIMfrwhEa3/uWRrM/ee8oWJopHux
-----END RSA PRIVATE KEY-----
```

#### Install Nginx

For SSL termination and Node application proxying, Nginx is used. To install it, perform the following:

```bash
sudo apt-get install nginx -y
```

#### Install and Configure Postings-API

```bash
cd ~/source
git clone git@github.com:HashtagSell/posting-api.git
cd posting-api.git
npm install
sudo npm install -g bunyan
sudo npm install -g gulp
```

Now to configure:

```bash
mkdir ~/source/posting-api/config
touch ~/source/posting-api/config/production.json
```

Now edit the `~/source/posting-api/config/production.json` file to add the following (note the reference to the Hostname below refers to the internal ELB where the MongoDB EC2 instance should be added):

```json
{
	"data": {
		"url": "mongodb://internal-stage-hashtagsell-data-154009749.us-west-2.elb.amazonaws.com:27017/hashtagsell-posting-v1"
	},
	"server": {
		"port": 8880,
		"secure": false
	}
}
```

Now copy the appropriate init scripts to the `/etc` folder:

```bash
sudo cp ~/source/posting-api/init/posting-api.conf /etc/init
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.orig
sudo cp ~/source/posting-api/init/nginx.conf /etc/nginx/
```
