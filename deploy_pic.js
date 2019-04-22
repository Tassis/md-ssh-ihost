const fs = require('fs');               // file system.
const path = require('path');    
const url = require('url');      
const config = JSON.parse(fs.readFileSync('deploy_cfg.json'));
// load sftp config.
const sftp_cfg = config.sftp;
const common_cfg = config.common;
// load path from deploy_cfg.json.
const localRootDirectory = sftp_cfg.localRootDirectory ? sftp_cfg.localRootDirectory : '.';
const remoteRootDirectory = sftp_cfg.remoteRootDirectory ? sftp_cfg.remoteRootDirectory : '.'
const ignore_rule = config.ignore_rule ? config.ignore_rule : [];
// 確認本地端是否有檔案需要上傳
files = fs.readdirSync(localRootDirectory);
if (files < 1){
    return;
}


const node_ssh = require('node-ssh');   // node-ssh package
const ssh = new node_ssh();

const ssh_config = {
    host: sftp_cfg.host,
    username: sftp_cfg.username,
    privateKey: sftp_cfg.privateKey,
    passphrase: sftp_cfg.passphrase
}

const failed = [];
const successful = [];


// 建立 ssh 連接
ssh.connect(ssh_config).then(function(){
    console.log('ssh linked successful.');
    ssh.putDirectory(localRootDirectory, remoteRootDirectory, {
        recursive: true,    // 遞迴上傳
        concurrency: 2,     // 併發數量，太大會丟出錯誤。
        validate: function(item_path){
            // 驗證檔案名稱， return true 才會允許傳輸。
            const basename = path.basename(item_path);
            ignore_rule.forEach(element => {
                if(basename.includes(element))
                    return false;
            });
            return true;
        },

        // 上傳 成功/失敗時的 callback
        tick: function(local_path, remote_path, error){
            if (error){
                console.log(`failed ${local_path} ` )
            } else {
                console.log(`successful ${local_path} ` )
                successful.push(local_path);
            }
        }
    })
    .then(function(status){
        console.log('the directory transfer was', status ? 'successful' : 'unsuccessful')
        // 若有上傳失敗的檔案就打印出來。
        if(failed.length > 0)
            console.log('failed transfers', failed.join(',\n '))
        // 運行結束 斷開連接
        ssh.dispose();
        // 刷新 markdown 檔案
        refersh_markdown(successful); 
    })
}, function(error){
    console.log('something error,' , error);
});

/**
 * 將 markdown 中的圖片連結替換為 url.
 * @param successful_list 上傳成功的清單
 */
function refersh_markdown(successful_list){
    // get post dir.
    post_dir = common_cfg.post_dir;
    console.log(successful_list)
    // get .md file name from folder name.
    files.forEach(md_name => {
        // load .md file.
        post_path = path.join(post_dir, `${md_name}.md`);
        post_data = fs.readFileSync(post_path).toString();
        // replace file path.
        successful_list.forEach(element => {
            file_path = element.replace("assets/", "/")
            if (post_data.includes(`](${file_path}`)){
                new_url = url.resolve(common_cfg.server_url, file_path);
                console.log(`${file_path}`, '=>', new_url);
                post_data = post_data.replace(`](${file_path}`, `](${new_url})`);
            }
        });
        // 修改完畢寫入回去
        fs.writeFileSync(post_path, post_data, function(error){
            if(error)
                console.error(error);
        })
    });

    // 若有開啟移除上傳成功的圖片
    if (common_cfg.removeImageOnSuccessful)
        remove_succcess_upload(successful_list);
}

/**
 * 移除上傳成功的圖片
 * @param {} successful_list 
 */
function remove_succcess_upload(successful_list){
    successful_list.forEach(element => {
        if (fs.existsSync(element)){
            fs.unlinkSync(element);
        }
    }); 

    files.forEach(element => {
        dir_path = path.join(localRootDirectory, element);
        // 資料夾不存在直接跳出
        if (!fs.existsSync(dir_path))
            return;
        // 讀取資料夾的內容 若為空則移除。        
        files =  fs.readdirSync(dir_path);
        if(!files.length)
            fs.rmdirSync(dir_path)
    });
}


process.on('unhandledRejection', error => {
    console.error('unhandledRejection', error);
    process.exit(1) // To exit with a 'failure' code
});