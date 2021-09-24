var fs = require("fs");
var recursive = require("recursive-readdir");
var crypto = require('crypto');
var pathModule = require("path");
var readlineSync = require('readline-sync');

async function main() {
    const choices = ['Encrypt Folder', 'Decrypt Folder', 'Encrypt Folder with max file size limit', 'Encrypt File', 'Decrypt File'];
    var choice = readlineSync.keyInSelect(choices, 'Select your choice: ');
    const file_path = readlineSync.questionPath('Enter Relative Path: ');
    if (!fs.existsSync(file_path)) {
        console.log("Item doesn't exist on disk");
        readlineSync.keyInPause();
        process.exit(-1)
    }
    var password = undefined
    if (choice != 1 && choice != 4) {
        var password2 = undefined
        while (!password || (password != password2 || password == '')) {
            password = readlineSync.question('Enter Password: ', { hideEchoBack: true });
            password2 = readlineSync.question('Enter Password again: ', { hideEchoBack: true });
            if (password != password2)
                console.log("Passwords do not match")
            else if (password == '')
                console.log('Empty passwords not allowed')
        }

    } else {
        password = readlineSync.question('Enter Password: ', { hideEchoBack: true });
    }
    console.log("Path: " + file_path)
    if (!readlineSync.keyInYNStrict('Proceed..? Y/N'))
        process.exit(0)
    var start = Date.now()
    switch (choice) {
        case 0:
            await encryptFolder(file_path, password)
            console.log("Encrypted!")
            break
        case 1:
            await decryptFolder(file_path, password)
            console.log("Decrypted!")
            break
        case 2:
            await encryptFolder(file_path, password, readlineSync.questionFloat("Max Filesize (in MB)"))
            console.log("Encrypted!")
            break
        case 3:
            try {
                await encryptFile(file_path, password)
                console.log("Encrypted!")
            } catch (e) {
                console.log("Error Encrypting!")
            }
            break
        case 4:
            try {
                await decryptFile(file_path, password)
                console.log("Decrypted!")
            } catch (e) {
                console.log("Error Decrypting!")
            }
            break
    }
    console.log("Time taken: " + ((Date.now() - start) / 1000) + "s")
    readlineSync.keyInPause();
    process.exit(0)

}

function encryptFileI(inputPath, outputPath, key, callback) {
    var inputStream = fs.createReadStream(inputPath);
    var outputStream = fs.createWriteStream(outputPath);
    var cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.from('fda2f5ddca990c8719f20b158ff9ee00', 'hex'));
    inputStream.pipe(cipher).pipe(outputStream);
    outputStream.on('finish', function () {
        return callback();
    });
}

function encryptText(text, key) {
    var cipher = crypto.createCipheriv('aes-256-cbc', crypto.pbkdf2Sync(key, Buffer.from('ba6dfaa9a6db69f0f2d50745a3516f1cb080e637ceadea4f5e6d9edff3c079602130694585e1df1a3a3176b20fcd10b0af87f6dc766fafd26b0928e7c49ebcdf', 'hex'), 2145, 32, 'sha512'), Buffer.from('fda2f5ddca990c8719f20b158ff9ee00', 'hex'));
    return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
function decryptText(text, key) {
    try {
        var decipher = crypto.createDecipheriv('aes-256-cbc', crypto.pbkdf2Sync(key, Buffer.from('ba6dfaa9a6db69f0f2d50745a3516f1cb080e637ceadea4f5e6d9edff3c079602130694585e1df1a3a3176b20fcd10b0af87f6dc766fafd26b0928e7c49ebcdf', 'hex'), 2145, 32, 'sha512'), Buffer.from('fda2f5ddca990c8719f20b158ff9ee00', 'hex'));
        return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
    }
    catch (e) {
        console.log("Wrong Key!")
        readlineSync.keyInPause()
        process.exit(0)
    }
}

function decryptFileI(inputPath, outputPath, key, callback) {
    var inputStream = fs.createReadStream(inputPath);
    var outputStream = fs.createWriteStream(outputPath);
    var cipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from('fda2f5ddca990c8719f20b158ff9ee00', 'hex'));
    inputStream.pipe(cipher).pipe(outputStream);
    outputStream.on('finish', function () {
        return callback();
    });
}


async function encryptFile(inputFile, key = "1234") {
    return new Promise((resolve, reject) => {
        if (key == "1234") {
            return reject("Set a good key");
        }
        fs.stat(inputFile, function (err) {
            if (err)
                return reject("No such file");
            if (inputFile.endsWith(".enc"))
                return resolve("Already Encrypted");
            encryptFileI(inputFile, pathModule.dirname(inputFile) + "/" + encryptText(pathModule.basename(inputFile), key) + ".enc", key, function (err) {
                if (err)
                    return reject(err);
                else
                    fs.unlink(inputFile, function (err) {
                        if (err)
                            return reject();
                        else
                            return resolve();
                    });
            });
        });
    });
}

async function decryptFile(inputFile, key = "1234") {
    return new Promise((resolve, reject) => {
        if (key == "1234") {
            return reject("Set a good key");
        }
        fs.stat(inputFile, function (err) {
            if (err)
                return reject("No such file");
            if (!inputFile.endsWith(".enc"))
                return resolve("Not Encrypted");
            decryptFileI(inputFile, pathModule.dirname(inputFile) + "/" + decryptText(pathModule.basename(inputFile).split(".enc")[0], key), key, function (err) {
                if (err)
                    return reject(err);
                else
                    fs.unlink(inputFile, function (err) {
                        if (err)
                            return reject();
                        else
                            return resolve();
                    });
            });
        });
    });
}

async function encryptFolder(path, key, maxFileSize = 0) {
    return new Promise(async (resolve, reject) => {
        key = Buffer.from(key.split('').reverse().join('')).toString('base64');
        key = crypto.pbkdf2Sync(key, Buffer.from('ba6dfaa9a6db69f0f2d50745a3516f1cb080e637ceadea4f5e6d9edff3c079602130694585e1df1a3a3176b20fcd10b0af87f6dc766fafd26b0928e7c49ebcdf', 'hex'), 2145, 32, 'sha512');
        var files = await recursive(path, ["node_modules", "*.enc"]);
        var promises = []
        for (let i = 0; i < files.length; i++) {
            var file = files[i];
            if (maxFileSize != 0)
                if (((fs.statSync(file).size) / 1000000.0) > maxFileSize)
                    continue
            promises.push(encryptFile(file, key));
        }
        Promise.all(promises).then(() => { resolve() }).catch((err) => {
            if (err) {
                throw new Error(err);
            }
        });
    })
}

async function decryptFolder(path, key) {
    return new Promise(async (resolve, reject) => {
        key = Buffer.from(key.split('').reverse().join('')).toString('base64');
        key = crypto.pbkdf2Sync(key, Buffer.from('ba6dfaa9a6db69f0f2d50745a3516f1cb080e637ceadea4f5e6d9edff3c079602130694585e1df1a3a3176b20fcd10b0af87f6dc766fafd26b0928e7c49ebcdf', 'hex'), 2145, 32, 'sha512');
        var files = await recursive(path, ["node_modules"]);
        var promises = []
        for (let i = 0; i < files.length; i++) {
            var file = files[i];
            promises.push(decryptFile(file, key))
        }
        Promise.all(promises).then(() => resolve()).catch((err) => {
            if (err) {
                fs.unlinkSync(file.split(".enc")[0]);
                throw new Error(err);
            }
        });
    })
}

main()
