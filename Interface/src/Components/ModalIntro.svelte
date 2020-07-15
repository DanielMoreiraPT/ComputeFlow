{#if show}
<div>

  <div class="modal-overlay" data-close on:click={overlay_click} transition:fade={{duration: 150}}>
    <div class="modal-container">
      <main><h1>Inner Workings of ComputeFlow</h1>
                         
            <h3>This is an aplication that aims to represent data flows and allgorithms in a flow programming paradigm.</h3>
                   
                <p>In the SideBar there is 2 types of modules: variables (modules with only outputs) and functions that may process multiple entries and output one or more results</p>

                <p>Both this modules can be dragged into the chart, creating an execution graph that will be compiled in the JULIA runtime</p>
                    
                <p>It's also possible to find the "Load Project" section in the SideBar, where its located all graphs stored in JSON files under the same directory.</p>

                <p>In the NavBar there is the possiblity to clean the chart by selecting "New Project", selecting "Save Project" will save the graph presented on the chart into a JSON file and the "Save Project as" will allow to define the name of the project.</p>
                <p> There is also a Undo/Redo functionality allowing the user to access a previous chart state</p>
                    
            <h2>Note(for more advanced users)</h2>   
                <p>All modules(both variables and functions) presented in the SideBar are defined in the "ModuleTemplates" JSON file, wich can be editted to add more modules into the interface, in a way that meets the user needs.</p>
                
                
    </main>
    </div>
  </div>
</div>
{/if}

<script lang="typescript">
import { fade } from 'svelte/transition';

function overlay_click(e) {
    if ('close' in e.target.dataset)
        show = false;
}
    
export let show = false;
</script>

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
  background-color:rgb(51, 51, 51);
  width: 50vw;
  margin: 1rem auto 0.2rem;
  box-shadow: 0 3px 10px #555;
}
main {
  padding: 0.5rem;
  color: white;
}
</style>