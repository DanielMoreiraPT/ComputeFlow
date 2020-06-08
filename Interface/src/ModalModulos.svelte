
<script lang="typescript">
import { fade } from 'svelte/transition';
//TODO -> improvement
//change templates to public
import { TemplateModule, TemplatePort} from './templates';
import { createEventDispatcher} from 'svelte';
const dispatch = createEventDispatcher();
import Button from './Button.svelte';
export let show = false;

function overlay_click(e) {
    if ('close' in e.target.dataset)
        show = false;
}

let ModulesTemplatesList = [];

let ModuleVarList = [];
let ModuleFunctionList = [];
function sendModuleInfo(ModuleTemplate: TemplateModule){
     show = false;
    dispatch('AddModule', {
                module: ModuleTemplate
            });   
}


//read Templates for the Modules --> inside public dr
var fs = require('fs');
var path = require('path');  
var filePath = path.join(__dirname, 'ModulesTemplates.json');
fs.readFile(filePath, function( err,data){
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
            //console.log(tempVar)
            ModuleVarList.push(tempVar)
        }
        for(i=0; i<json.Templates.Functions.length; i++){
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
            tempVar.functionId=json.Templates.Functions[i].FunctionID
            //console.log(tempVar)
            ModuleFunctionList.push(tempVar)
        }
    } else {
        console.log(err);
    }
});


</script>

{#if show}
<div>

  <div class="modal-overlay" data-close on:click={overlay_click} transition:fade={{duration: 250}}>
    <div class="modal-container">
        <main>
            {#if ModuleVarList.length!=0}
                <h1>Variables</h1>
                {#each ModuleVarList as variable}
                    <Button on:click={e => sendModuleInfo(variable)}>{variable.name}</Button>
                {/each}
            {:else}
                <h1>No templates for Variables</h1>
            {/if}
            {#if ModuleFunctionList.length!=0}
                <h1>Functions</h1>
                {#each ModuleFunctionList as variable}
                    <Button on:click={e => sendModuleInfo(variable)}>{variable.name}</Button>
                {/each}
            {:else}
                <h1>No templates for Functions</h1>
            {/if}

        </main>
    </div>
  </div>
</div>
{/if}

<style>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.modal-container {
  position: relative;
  background-color:rgb(92, 20, 44);;
  width: 90vw;
  margin: 1rem auto 0.2rem;
  box-shadow: 0 3px 10px #555;
}
main {
  padding: 0.5rem;
  color: white;
}

</style>