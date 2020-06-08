<script lang="typescript">
    import FlowModuleContent from './FlowModuleContent.svelte';
	import FlowModuleHeader from './FlowModuleHeader.svelte';
    import { spring } from 'svelte/motion';
    import {draggable} from './draggable'
    import { Module, Port, Connection } from './StructureLogic';
    import { createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
    
    export let StrucModule: Module;
	let xPos: number = StrucModule.getXPos();
	let yPos: number = StrucModule.getYPos();

	//this needs to be dynamic due to the number of outputs and inputs
    let moduleHeight: number = StrucModule.getModuleHeight(); //size of the header
	let contentHeight: number = StrucModule.getContentHeight();
	let moduleWidth: number = StrucModule.getModuleWidth();

    //TODO verify types of list here to ts

    //if i want to access rect from component's parent (chart) -> add export
    let rect;

    //draggable vars
	let dx = 0;
    let dy = 0;
    
    //in order to set x and y pos correctly on the module, we need to revert previous transformations changes (dx, dy)
    let lastdx: number = 0;
    let lastdy: number = 0;

    
    const handleDragMove = (e) => {
        let { lastX:lastX, lastY:lastY, dx: _dx, dy: _dy } = e.detail;
        rect.setAttribute('stroke-width', '14px');
		dx += _dx;
        dy += _dy;
        let moduleX: number = StrucModule.getXPos();
        let moduleY: number = StrucModule.getYPos();

        StrucModule.setXPos(moduleX+dx-lastdx);
        StrucModule.setYPos(moduleY+dy-lastdy);

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
        let moduleX: number = StrucModule.getXPos();
        let moduleY: number = StrucModule.getYPos();

        StrucModule.setXPos(moduleX+dx-lastdx);
        StrucModule.setYPos(moduleY+dy-lastdy);

        dispatch('handleDragEnd', {
                    Module: {StrucModule},
                    lastX: {lastX},
                    lastY: {lastY},
                    dx: {dx},
                    dy: {dy}
                });
        lastdx = dx;
        lastdy = dy;    
    }
    const handleDragStart = (e) => {
        let {lastX, lastY} = e.detail
        rect.setAttribute('stroke', 'green');
        rect.setAttribute('stroke-width', '10px');
    }
	const handleConnectionStart = (e) => {
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
        console.log("Modulo clickado")
        console.log(StrucModule)
         dispatch('DblclickModule', {
            moduleClicked: StrucModule
                });
    }

</script>

<g class="node-container" 
    transform={`translate(${dx} ${dy})`} 
    on:dblclick={handleDblClick} >    
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
    <g             
        use:draggable  
        on:dragmove={handleDragMove}
        on:dragstart={handleDragStart}   
        on:dragend={handleDragEnd}>
	    <FlowModuleHeader 
            ModuleName={StrucModule.getName()} 
            moduleWidth={moduleWidth} 
            xPos={xPos} 
            yPos={yPos}/>
    </g>	
    <!-- TODO headerHeight nao dinamico-->
    <FlowModuleContent 
        moduleWidth={moduleWidth} 
        xPos={xPos} 
        yPos={yPos} 
        OutputList={StrucModule.getOutputList()} 
        InputList={StrucModule.getInputList()} 
        contentHeight={contentHeight}
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