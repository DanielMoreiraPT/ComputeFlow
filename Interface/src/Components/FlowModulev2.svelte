<script lang="typescript">
    import { spring } from 'svelte/motion';
    import {draggable} from './draggable'
    
    //Classes
    import { Module, Port, Connection } from './StructureLogic';
    
    //Dispatcher
    import { createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
    
    //Components
	import FlowModuleHeaderv2 from './FlowModuleHeaderv2.svelte';
	import FlowModuleContentv2 from './FlowModuleContentv2.svelte';
   
    export let StrucModule: Module;
    let xPos:number;
    let yPos:number;
    let moduleName:string;
    let moduleWidth:number;
    let moduleHeight:number;

    $:xPos = StrucModule.xPos;
    $:yPos = StrucModule.yPos;
    $:moduleName = StrucModule.name;
    $:moduleWidth = StrucModule.getModuleWidth();
    $:moduleHeight = StrucModule.getModuleHeight();



    //if i want to access rect from component's parent (chart) -> add export
    let rect;

    //draggable vars
	let dx = 0;
    let dy = 0;
    
    //in order to set x and y pos correctly on the module, we need to revert previous transformations changes (dx, dy)
    let lastdx: number = 0;
    let lastdy: number = 0;


 
    const handleDragStart = (e) => {
        rect.setAttribute('stroke', '#E7DFDD');
        rect.setAttribute('stroke-width', '10px');
    }
    const handleDragMove = (e) => {
        let { lastX:lastX, lastY:lastY, dx: _dx, dy: _dy } = e.detail;
		dx += _dx;
        dy += _dy;
        StrucModule.xPos=xPos+dx-lastdx;
        StrucModule.yPos=yPos+dy-lastdy;
        dx=0;
        dy=0;
        //console.log("FlowModulev2 -> xPos:"+xPos+" ; yPos:"+yPos)
        //console.log("FlowModulev2 -> dx:"+dx+" ; dy:"+dy)
        
        dispatch('handleDragMove', {    
                    Module: {StrucModule},
                    lastX: {lastX},
                    lastY: {lastY},
                    dx: {dx},
                    dy: {dy}
                });
        
        lastdx = dx;
        lastdy = dy;    
        
    }
    const handleDragEnd = (e) => {
        let {lastX, lastY} = e.detail
        rect.setAttribute('stroke', 'green');
        rect.setAttribute('stroke-width', '0px');
        
        dispatch('handleDragEnd');
        
        lastdx = 0;
        lastdy = 0; 
        
        
    }
	const handleConnectionStart = (e) => {
        //console.log("FlowModulev2 -> connection start handler")
        let {xInitial, xFinal, yInitial, yFinal, port} = e.detail;
        dispatch('handleConnectionStart', {
                    xInitial: {xInitial},
                    xFinal: {xFinal},
                    yInitial: {yInitial},
                    yFinal: {yFinal},
                    port: {port},
                    parentModule : {StrucModule}
                });
		
    }   
	const handleConnectionDrag = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port} = e.detail;
        dispatch('handleConnectionDrag', {
                    xInitial: {xInitial},
                    xFinal: {xFinal},
                    yInitial: {yInitial},
                    yFinal: {yFinal},
                    port: {port},
                    parentModule : {StrucModule}
                });
		
    }
	const handleConnectionEnd = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port} = e.detail;
        dispatch('handleConnectionEnd', {
                    xInitial: {xInitial},
                    xFinal: {xFinal},
                    yInitial: {yInitial},
                    yFinal: {yFinal},
                    port: {port},
                    parentModule : {StrucModule}
                });
    }
    const handleDblClick = (e) => {
        //console.log("FlowModulev2 -> Modulo clickado")
        dispatch('DblclickModule', {
            moduleClicked: StrucModule
                });
        }



</script>

<g class="node-container" 
    transform={`translate(${dx} ${dy})`}
    on:dblclick={handleDblClick}>    
	<rect 
        bind:this={rect} 
        class="node-background" 
        x={xPos} 
        y={yPos} 
        width={moduleWidth} 
        height={moduleHeight} 
        rx="6" 
        ry="6" 
        />	
    <g  use:draggable  
        on:dragmove={handleDragMove}
        on:dragstart={handleDragStart}   
        on:dragend={handleDragEnd}>
	    <FlowModuleHeaderv2
            StrucModule={StrucModule}
            />
    </g>	
    <FlowModuleContentv2 
        StrucModule={StrucModule}
        on:handleConnectionStart={handleConnectionStart}
        on:handleConnectionDrag={handleConnectionDrag}
        on:handleConnectionEnd={handleConnectionEnd}
        /> 
</g>
<style>
	.node-container {
	cursor: move;
	}
	.node-background {
	fill: #1a1c1d;
	}
</style>