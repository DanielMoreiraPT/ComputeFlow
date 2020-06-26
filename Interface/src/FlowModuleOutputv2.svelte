<script lang="typescript">
	import { Module, Port } from './StructureLogic';
	import { connections } from './connections';
    
    import { createEventDispatcher} from 'svelte'; 	
    const dispatch = createEventDispatcher();
    //corresponds to the number of the port, of its the 1st, 2nd,...
	export let portNumber: number;
	export let port: Port;
    export let StrucModule: Module;

	let xPos: number;
    let yPos: number;
    let moduleWidth: number;
	let varType: string;
	let varName: string;
	let cx : number;
	let cy : number;
	let portLabelX: number;
	let portLabelY: number;
	let transformValue: number;
	let cyRealValue : number;

	let space: string = ' ';
    

    
    $:xPos = StrucModule.xPos;
    $:yPos = StrucModule.yPos;
    $:moduleWidth = StrucModule.getModuleWidth();
    $:varType = port.varType;
    $:varName = port.varName;
    $:cx = xPos+moduleWidth-11;
    $:cy = yPos+10;
    $:portLabelX = xPos+moduleWidth-24;
    $:portLabelY = yPos+14;
    $:transformValue = 50+(25*portNumber);
    $:cyRealValue = cy+transformValue;


	port.xPos=parseInt(StrucModule.xPos)+parseInt(StrucModule.getModuleWidth())-11;
	port.yPos=parseInt(StrucModule.yPos)+10+50+(25*portNumber);
    port.id=portNumber;
	//console.log("cx: "+port.xPos)
	//console.log("cyRealValue: "+port.yPos)
	//console.log("portNumber: "+port.id)
    
	const handleConnectionStart = (e) => {
		let {lastX, lastY} = e.detail
		dispatch('handleConnectionStart', {
                    xInitial: cx,
                    xFinal: lastX,
                    yInitial: cyRealValue,
                    yFinal: lastY,
					port: {port}
                });
		
    }
	const handleConnectionDrag = (e) => {
		let {lastX, lastY, dx, dy} = e.detail
		dispatch('handleConnectionDrag', {
			xInitial: cx,
			xFinal: lastX,
			yInitial: cyRealValue,
			yFinal: lastY,
			port: {port}
		});
	}
	const handleConnectionEnd = (e) => {
		let {lastX, lastY, dx, dy} = e.detail
		dispatch('handleConnectionEnd', {
			xInitial: cx,
			xFinal: lastX,
			yInitial: cyRealValue,
			yFinal: lastY,
			port: {port}
		});
	}
	
</script>


<g class="output-field" transform="translate(0, {transformValue})">
    <g class="port" 
				use:connections
				on:connectionDrag={handleConnectionDrag}
				on:connectionStart={handleConnectionStart}
				on:connectionEnd={handleConnectionEnd}>
        <circle class="port-outer" cx={cx} cy={cy} r="7.5" />
        <circle class="port-inner" cx={cx} cy={cy} r="5" />
        <circle class="port-scrim" cx={cx} cy={cy} r="7.5" />
    </g>
    <text class="port-label" x={portLabelX} y={portLabelY}>{varType} {space} {varName}</text>
</g>




<style>
	.port {
	cursor: pointer;
	}
	.port-scrim {
	fill: transparent;
	}
	.port-outer {
	fill: #000000;
	}
	.port-inner {
	fill: #ffffff;
	}
	.port-label {
	font-size: 12px;
	fill: #fff;
	}
	.input-field .port-label {
	text-anchor: start;
	}
	.output-field .port-label {
	text-anchor: end;
	}
</style>