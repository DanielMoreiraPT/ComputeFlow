<script lang="typescript">
import { Connection } from './StructureLogic';
export let connection: Connection;
import { createEventDispatcher} from 'svelte';
const dispatch = createEventDispatcher();

const handleDblClick = (e) => {
        dispatch('DblclickConnection', {
            connectionClicked: connection
                });
}
</script>



<path d={connection.curve} on:dblclick={handleDblClick} fill="transparent"/>
<circle cx={connection.parentPort.xPos} cy={connection.parentPort.yPos} r="5" />
<circle cx={connection.externalPort.xPos} cy={connection.externalPort.yPos} r="5" />

<style>

    path{
        stroke-width: 5;
        stroke-opacity: 0.5;
        stroke:#f17b53;

    }
    path:hover{
        stroke-width: 7;
        stroke-opacity: 0.7;
        stroke:#ff4000;

    }
	circle { 
        fill: #ff3e00; 
        opacity:1;
    }
	circle:hover { 
        fill: #a50c25; 
        opacity:1;
    }

</style>