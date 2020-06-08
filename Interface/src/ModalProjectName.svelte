{#if show}
<div>

  <div class="modal-overlay" data-close on:click={overlay_click} transition:fade={{duration: 150}}>
    <div class="modal-container">
      <main>
        <div> 
            <h1>Name: </h1>
            <input bind:value={ProjectName} name="Project Name">
        </div>
        <div>
            <Button on:click={saveProject}>Save</Button>
        </div>
    </main>
    </div>
  </div>
</div>
{/if}

<script lang="typescript">
import Button from './Button.svelte';
import { fade } from 'svelte/transition';
import { createEventDispatcher} from 'svelte';
const dispatch = createEventDispatcher();


const saveProject = (e) => {
    show = false;
    dispatch('SaveProjectAndName', {
                name: ProjectName
            });   
    
}

function overlay_click(e) {
    if ('close' in e.target.dataset)
        show = false;
}
export let ProjectName:string;
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
  background-color:rgb(92, 20, 44);;
  width: 90vw;
  margin: 1rem auto 0.2rem;
  box-shadow: 0 3px 10px #555;
}
main {
  padding: 0.5rem;
  color: white;
}
h1 {
  color: white;
}
</style>