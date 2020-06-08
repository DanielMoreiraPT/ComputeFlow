var remote = require('remote'); // Load remote compnent that contains the dialog dependency
var dialog = remote.require('dialog'); // Load the dialogs component of the OS
var fs = require('fs'); // Load the File System to execute our common tasks (CRUD)

let content = "Some text to save into the file";

//create file
export function CreateFile(){
    // You can obviously give a direct path without use the dialog (C:/Program Files/path/myfileexample.txt)
    dialog.showSaveDialog((fileName) => {
        if (fileName === undefined){
            console.log("You didn't save the file");
            return;
        }

        // fileName is a string that contains the path and filename created in the save file dialog.  
        fs.writeFile(fileName, content, (err) => {
            if(err){
                alert("An error ocurred creating the file "+ err.message)
            }
                        
            alert("The file has been succesfully saved");
        });
    }); 
}
//read file
export function ReadFile(){
    dialog.showOpenDialog((fileNames) => {
        // fileNames is an array that contains all the selected
        if(fileNames === undefined){
            console.log("No file selected");
            return;
        }

        fs.readFile(filepath, 'utf-8', (err, data) => {
            if(err){
                alert("An error ocurred reading the file :" + err.message);
                return;
            }

            // Change how to handle the file content
            console.log("The file content is : " + data);
        });
    });
    

    // Note that the previous example will handle only 1 file, if you want that the dialog accepts multiple files, then change the settings:
    // And obviously , loop through the fileNames and read every file manually
    dialog.showOpenDialog({ 
        properties: [ 
            'openFile', 'multiSelections', (fileNames) => {
                console.log(fileNames);
            }
        ]
    });
}

//update file
export function UpdateFile(){
    var filepath = "C:/Previous-filepath/existinfile.txt";// you need to save the filepath when you open the file to update without use the filechooser dialog againg
    var content = "This is the new content of the file";

    fs.writeFile(filepath, content, (err) => {
        if (err) {
            alert("An error ocurred updating the file" + err.message);
            console.log(err);
            return;
        }

        alert("The file has been succesfully saved");
    });
}

