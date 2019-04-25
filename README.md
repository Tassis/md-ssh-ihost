# MD-SSH-IHOST

Upload image to hosting and change markdown's path tool.



## usage

```javascript
const ihost = require('ssh-ihost')

const config = {
    base_url:                   "http://localhost",
    localRootDirectory :        "./assets",
    remoteRootDirectory:        "./www",
    post_dir:                   "./source/_posts",
    removeImageOnSuccessful:    true,

    sftp : {
        host:                   "<hostname>",
        username:               "<username>",
        password:               "<password>",
        privateKey:             "<private_key>",
        passphrase:             "<private_key_passphrase>"
    }
}

console.log(ihost.upload(config, function(successful, failed){
    ihost.refersh_path(successful, config);
}));
```

