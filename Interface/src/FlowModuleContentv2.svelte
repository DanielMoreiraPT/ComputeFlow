<script lang="typescript">
    import FlowModuleInputv2 from './FlowModuleInputv2.svelte';
    import FlowModuleOutputv2 from './FlowModuleOutputv2.svelte';
    import { Module, Port, Connection } from './StructureLogic';
    import { createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
       
    export let StrucModule: Module;

	let xPos: number;
	let yPos: number;
    let moduleWidth: number;
    let OutputList;
    let InputList;

    //it changes due to the number of inputs
    let contentHeight: number;
    let contentHeightRect: number;

    //if needed to change or adjust the background of the content
    let contentRectX: number;   
    let contentRectY: number; //40 is the header size... can make it a attribute later //TODO
   
    $:xPos = StrucModule.xPos;
    $:yPos = StrucModule.yPos;
    $:moduleWidth = StrucModule.getModuleWidth();
    $:InputList = StrucModule.inputList;
    $:OutputList = StrucModule.outputList;
    $:contentHeight = StrucModule.getContentHeight();
    $:contentHeight = contentHeight-5;
    $:contentRectX = xPos+2;
    $:contentRectY = yPos+44;

    
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
            <FlowModuleInputv2 
                port={item}
                portNumber={i} 
                StrucModule={StrucModule} 
                on:handleConnectionStart={handleConnectionStart}
                on:handleConnectionDrag={handleConnectionDrag}
                on:handleConnectionEnd={handleConnectionEnd}/>
        {/each}
    </g>    
    <g class="outputs">
        
        {#each OutputList as item, i (i)}
            <FlowModuleOutputv2 
                port={item}
                portNumber={i} 
                StrucModule={StrucModule} 
                on:handleConnectionStart={handleConnectionStart}
                on:handleConnectionDrag={handleConnectionDrag}
                on:handleConnectionEnd={handleConnectionEnd}/>
        {/each}
    </g>
    
</g>

<style>
	.node-content {
	fill: rgb(117, 117, 117);
	}
</style> 