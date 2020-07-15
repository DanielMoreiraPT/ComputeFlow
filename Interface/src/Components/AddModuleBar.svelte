<script lang="typescript">
import { fade } from 'svelte/transition';
//TODO -> improvement
//change templates to public
import { TemplateModule, TemplatePort } from './templates';
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();
import MyButton from './Button.svelte';
import { onMount } from 'svelte';


let modulesTemplatesList = [];
let moduleVarList = [];
let moduleFunctionList = [];
function sendModuleInfo(ModuleTemplate: TemplateModule){
    dispatch('AddModule', {
                module: ModuleTemplate
            });
}

//read Templates for the Modules --> inside public dr
var fs = require('fs');
var path = require('path');
var filePath = path.join(__dirname, 'ModulesTemplates.json');

onMount(async () => {
    fs.readFile(filePath, function(err,data){
        if (!err) {
            let json = JSON.parse(data);
            let i: number;
            for(i=0; i<json.Templates.Variables.length; i++){
                let tempVar = new TemplateModule(json.Templates.Variables[i].Name);
                //como é var so vai ter outputs
                let j: number;
                for(j=0; j<json.Templates.Variables[i].IO.Outputs.length ; j++){
                    let tempPort = new TemplatePort(false, json.Templates.Variables[i].IO.Outputs[j].PortType, json.Templates.Variables[i].IO.Outputs[j].VarName)
                    tempVar.listOutputs.push(tempPort);
                }
                if(json.Templates.Variables[i].Variables){
                    tempVar.listVariables=json.Templates.Variables[i].Variables;
                }
                moduleVarList.push(tempVar)
            }
            for(i=0; i<json.Templates.Functions.length; i++) {
                let tempVar = new TemplateModule(json.Templates.Functions[i].Name);
                //como é function vai ter inputs e outputs
                let j: number;
                for(j=0; j<json.Templates.Functions[i].IO.Inputs.length ; j++){
                    let tempPort = new TemplatePort(true, json.Templates.Functions[i].IO.Inputs[j].PortType, json.Templates.Functions[i].IO.Inputs[j].VarName)
                    tempVar.listInputs.push(tempPort);
                }
                let h: number;

                for(h=0; h<json.Templates.Functions[i].IO.Outputs.length ; h++){
                    let tempPort = new TemplatePort(false, json.Templates.Functions[i].IO.Outputs[h].PortType, json.Templates.Functions[i].IO.Outputs[h].VarName)
                    tempVar.listOutputs.push(tempPort);
                }
                tempVar.functionId = json.Templates.Functions[i].FunctionID
                if(json.Templates.Functions[i].Variables){
                    tempVar.listVariables=json.Templates.Functions[i].Variables;
                }
                moduleFunctionList.push(tempVar)
            }
            moduleVarList = moduleVarList;
            moduleFunctionList = moduleFunctionList;
        } else {
            console.log(err);
        }
    });
});

</script>

{#if moduleVarList.length!=0}
    <h4>Variables</h4>
    {#each moduleVarList as variable}
        <MyButton on:click={e => sendModuleInfo(variable)} name={variable.name}></MyButton>
    {/each}
{:else}
    <h4>No templates for Variables</h4>
{/if}
{#if moduleFunctionList.length!=0}
    <h4>Functions</h4>
    {#each moduleFunctionList as variable}
        <MyButton on:click={e => sendModuleInfo(variable)} name={variable.name}></MyButton>
    {/each}
{:else}
    <h4>No templates for Functions</h4>
{/if}

<style>
    h1, h4 {
        color:white;
    }
</style>
