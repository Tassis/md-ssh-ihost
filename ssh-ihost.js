// include package.
const fs = require('fs')
const path = require('path')
const url = require('url')

function SSHIHostCore() {
    return {
        upload,
        refersh_path,
    }
}

/**
 * Upload File
 * @param {*} ssh_config 
 */
function upload( config , callback){
    files = get_files(config.localRootDirectory)
    // include ssh package.
    const node_ssh = require('node-ssh')
    const ssh = new node_ssh();
    
    const successful = [];
    const failed = [];
    ssh.connect(config.sftp).then(function(){
        console.log('[SSH-HOST] connection linked successful.')
        ssh.putDirectory(config.localRootDirectory, config.remoteRootDirectory, {
            tick: function(local_path, remote_path, error){
                if(error)
                {
                    console.log('Failed', local_path);
                    failed.push(local_path);
                }else{
                    console.log('Successful', local_path);
                    successful.push(local_path)
                }
            }
        }).then(function(status) {
            console.log( "transfer status:",status ? "success" : "falied");
            if(!status)  console.warn(failed);
            ssh.dispose();
            callback(successful, failed);
        })
    }, function(reject){
        if(reject)
        {
            console.error(reject);
            process.exit(1);
        }
    })    
}

/**
 * Refersh path text of file.
 */
function refersh_path(successful_list, config){
    files = get_files(config.localRootDirectory)
    console.log(successful_list);
    files.forEach(file_name => {
        file = get_post(file_name, config)
        // check file exist.
        if(!file)
        {
            console.error(`${config.post_dir}/${file_name}.md`, "is not exist.");
            return;
        }
        // refersh markdown.
        successful_list.forEach(element => {
            // get relative path
            relative_path = path.relative(config.localRootDirectory, element);
            // transfer to root path.
            pic_path = path.join('/', relative_path);
            if(file.includes(`](${pic_path}`))
            {
                pic_url = url.resolve(config.base_url, pic_path);
                console.log(`${file_name}.md`,':', pic_path, '=>', pic_url);
                data = file.replace(`](${pic_path}`, `](${pic_url}`);
                save_post(file_name, data, config);
            }
        });
    });
}

/**
 * Check whether have file need upload.
 */
function get_files(src){
    file_list = [];
    // if directory not exist.
    if(!fs.existsSync(src))
        fs.mkdirSync(src);
    // check have file.
    files = fs.readdirSync(src);
    files.forEach(element => {
        file_path = path.join(src, element)
        file_list.push(path.relative(src, file_path));
    });

    if(file_list.length < 1)
    {
        console.error('[SSH-IHOST] Nothing needs uploaded.') 
        root_path = src;
        process.exit(1);
    }

    return files
}

/**
 * get text from post_dir.
 * @param {*} name 
 * @param {*} config 
 */
function get_post(name,config){
    name = `${name}.md`
    post_path =  path.join(config.post_dir, name);
    if (!fs.existsSync(post_path))
        return null;
    post = fs.readFileSync(post_path).toString();
    return post
}


function save_post(name, data, config){
    name = `${name}.md`
    post_path =  path.join(config.post_dir, name);
    // 修改完畢寫入回去
    fs.writeFileSync(post_path, data, function(error){
        if(error)
            console.error(error);
    })
}

module.exports = SSHIHostCore();