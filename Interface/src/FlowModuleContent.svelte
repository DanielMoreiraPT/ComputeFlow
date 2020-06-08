<script lang="typescript">
    import FlowModuleInput from './FlowModuleInput.svelte';
    import FlowModuleOutput from './FlowModuleOutput.svelte';
    import { Module, Port, Connection } from './StructureLogic';
    import { createEventDispatcher} from 'svelte';
    
	export let xPos: number;
	export let yPos: number;
    export let moduleWidth: number;
    export let OutputList;
    export let InputList;

    //it changes due to the number of inputs
    export let contentHeight: number;
    let contentHeightRect: number = contentHeight-5

    //if needed to change or adjust the background of the content
    let contentRectX: number = xPos+2;   
    let contentRectY: number = yPos+44; //40 is the header size... can make it a attribute later //TODO

    const dispatch = createEventDispatcher();
          
	const handleConnectionStart = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port} = e.detail;
        dispatch('handleConnectionStart', {
                    xInitial: {xInitial},
                    xFinal: {xFinal},
                    yInitial: {yInitial},
                    yFinal: {yFinal},
                    port: {port}
                });
		
    }          
	const handleConnectionDrag = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port} = e.detail;
        dispatch('handleConnectionDrag', {
                    xInitial: {xInitial},
                    xFinal: {xFinal},
                    yInitial: {yInitial},
                    yFinal: {yFinal},
                    port: {port}
                });
		
    }       
	const handleConnectionEnd = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port} = e.detail;
        dispatch('handleConnectionEnd', {
                    xInitial: {xInitial},
                    xFinal: {xFinal},
                    yInitial: {yInitial},
                    yFinal: {yFinal},
                    port: {port}
                });
		
    }
	
</script>

<g class="node-content">
    <rect class="content-round-rect" width={moduleWidth} height={contentHeight} x={contentRectX} y={contentRectY} rx="4" ry="4" />
    <rect class="content-rect" width={moduleWidth} height={contentHeightRect}  x={contentRectX} y={contentRectY} />
    <g class="inputs">	
        {#each InputList as item, i (i)}
            <FlowModuleInput 
                port={item} 
                xPos={xPos} 
                yPos={yPos} 
                portNumber={i} 
                varType={item.getVarType()} 
                varName={item.getVarName()}
                on:handleConnectionStart={handleConnectionStart}
                on:handleConnectionDrag={handleConnectionDrag}
                on:handleConnectionEnd={handleConnectionEnd}/>
        {/each}
    </g>    
    <g class="outputs">
        {#each OutputList as item, i (i)}
            <FlowModuleOutput 
                port={item} 
                xPos={xPos} 
                yPos={yPos} 
                portNumber={i} 
                moduleWidth={moduleWidth} 
                varType={item.getVarType()} 
                varName={item.getVarName()}
                on:handleConnectionStart={handleConnectionStart}
                on:handleConnectionDrag={handleConnectionDrag}
                on:handleConnectionEnd={handleConnectionEnd}/>
        {/each}
    </g>
    
</g>

<style>
	.node-content {
	fill: #3C3C3C;
	}
</style> 