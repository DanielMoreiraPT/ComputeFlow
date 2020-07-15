<script lang="typescript">
    import FlowModulev2 from './FlowModulev2.svelte'
    import ConnectionSVG from './ConnectionSVG.svelte'
    import { onMount } from 'svelte';
    import { Module, Port, Connection, Chart } from './StructureLogic';
    import { spring } from 'svelte/motion';
	import {draggable} from './draggable.js'
    import { createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();

    export let ChartStruc: Chart;
    export let __HistoryChart: ChartHistory;

    //TODO allow dragging the chart --> need to chage values here and send it somehow to the modules so handlers can work properly
    let dx = 0;
    let dy = 0;

    // if Background_dx & dy is changed, it represents the ammount of space that is already dragged from the background(canvas)
    export let Background_dx;
    export let Background_dy;
    
	const handleDragMoveBackground = (e) => {
		let { dx: _dx, dy: _dy } = e.detail;
		dx += _dx;
        dy += _dy;
        Background_dx += _dx;
        Background_dy += _dy;
        dispatch('BackgroundMovement', {
                    Background_dx: {Background_dx},
                    Background_dy: {Background_dy}
                });
	}

    //ggotta be global and export from app maybe.. so other "apps" can access
    var connections: Connection[]=[];

    //verify if given coords represent a port and if it has certain PortType //TODO O(n**2) not a good thing
    function verifyCoordsIsPortFromType(CoordX:number, CoordY:number, originalPort: Port, originalModule: Module){
        for(let module of ChartStruc.ModuleList){
            //se a porta inicial for input so vamos avaliar outputs e vice versa
            if(originalPort.isInput == false){
                for(let input of module.inputList){
                    if(input.xPos - input.hiboxSize <= CoordX  && input.xPos + input.hiboxSize >= CoordX  ){
                        if(input.yPos - input.hiboxSize <= CoordY  && input.yPos + input.hiboxSize >= CoordY  ){
                            //we need to know if the types are the same
                            if(input.varType == originalPort.varType){
                                
                               //TODO nomes dinamicos
                                let name: string = 'connection' + ChartStruc.ModuleList.length
                                let connection = new Connection(name, originalPort, originalPort.isInput, originalModule, module, input);   
                                connection.setConnectedPort(input, module);    
                                
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                //inputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection)
                                originalModule.addOutputConnection(originalPort, input, module ,connection);
                                
                                //outputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection
                                module.addInputConnection(input, originalPort, originalModule ,connection);
    

                                connection.calculateCurve();      
                                ChartStruc.FinalConnections.push(connection);
                                ChartStruc.FinalConnections=ChartStruc.FinalConnections;
                                

                                
                                //History
                                __HistoryChart.addState(ChartStruc.toJSON());
                            }else{
                                
                                dispatch("wrongTypes");
                            }
                        }
                    }
                }
            }else{
                for(let output of module.outputList){
                    if(output.xPos - output.hiboxSize <= CoordX  && output.xPos + output.hiboxSize >= CoordX){
                        if(output.yPos - output.hiboxSize <= CoordY  && output.yPos + output.hiboxSize >= CoordY){
                            //we need to know the port of the module now
                            if(output.varType == originalPort.varType){
                                //TODO nomes dinamicos
                                let name: string = 'connection' + ChartStruc.ModuleList.length
                                let connection = new Connection(name, originalPort, originalPort.isInput, originalModule, module, output); 

                                connection.setConnectedPort(output, module);

                                //inputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection)
                                originalModule.addInputConnection(originalPort, output, module ,connection);
                                
                                //outputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection
                                module.addOutputConnection(output, originalPort, originalModule ,connection);
    
                                connection.calculateCurve();     
                                ChartStruc.FinalConnections.push(connection);
                                ChartStruc.FinalConnections=ChartStruc.FinalConnections;
                                dispatch('updateHistory');

                            }else{
                                dispatch("wrongTypes");
                            }
                        }
                    }
                }

            }
            
        }
    }

    //TODO posso nao tar sempre a criar e dar simplesment update as ligacoes
    const handleDragEnd = (e) => {
        //History
        __HistoryChart.addState(ChartStruc.toJSON());
        
    }
	const handleDragMove = (e) => {
        let moduleDragged: Module;
        moduleDragged = e.detail.Module;
        let dx : number = e.detail.dx.dx;
        let dy : number = e.detail.dy.dy; 
        let lastX : number = e.detail.lastX.lastX;
        let lastY : number = e.detail.lastY.lastY;  

        //TODO
        for (let moduleentry of ChartStruc.ModuleList){
            if(moduleentry.id == moduleDragged.StrucModule.id){
                moduleentry.setPortCoords();
                if(moduleentry.connectionsInputs !== undefined){
                    for(let inputconnection of moduleentry.connectionsInputs){
                        inputconnection.Connection.calculateCurve();
                        for(let finalconnection of ChartStruc.FinalConnections){
                            if(finalconnection.id == inputconnection.Connection.id){
                                finalconnection=inputconnection;
                            }
                        }
                    }
                }
                if(moduleentry.connectionsOutputs !== undefined){
                    for(let outputconnection of moduleentry.connectionsOutputs){
                        outputconnection.Connection.calculateCurve();
                        for(let finalconnection of ChartStruc.FinalConnections){
                            if(finalconnection.id == outputconnection.Connection.id){
                                finalconnection=outputconnection;
                            }
                        }
                    }
                }
            }
            ChartStruc.FinalConnections=ChartStruc.FinalConnections;
        }
    }
	const handleConnectionStart = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        //TODO id da conexao dinamicamente
        let connection = new Connection('tentativa', port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);
        connection.setEndPoints(xFinal.xFinal.xFinal-Background_dx-left, yFinal.yFinal.yFinal-Background_dy-top);
        connection.calculateCurve();
        connections.push(connection);
        connections=connections;
        
    }
	const handleConnectionDrag = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        connections=[];
        //TODO id da conexao dinamicamente
        let connection = new Connection('tentativa', port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);
        connection.setEndPoints( xFinal.xFinal.xFinal-Background_dx-left, yFinal.yFinal.yFinal-Background_dy-top);
        connection.calculateCurve();
        connections.push(connection);
        connections=connections;
    }
	const handleConnectionEnd = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        connections=[];
        verifyCoordsIsPortFromType(xFinal.xFinal.xFinal-Background_dx-left, yFinal.yFinal.yFinal-Background_dy-top, port.port.port.port, parentModule.StrucModule);

    }
	const handleDblClickConnection = (e) => {
        //History
        __HistoryChart.addState(ChartStruc.toJSON());

        for(let i=0; i<ChartStruc.ModuleList.length; i++){
            
            //retirar conexao do modulo pai
            if(ChartStruc.ModuleList[i].connectionsInputs !== undefined){
                for(let j=0; j<ChartStruc.ModuleList[i].connectionsInputs.length; j++){
                    if(ChartStruc.ModuleList[i].connectionsInputs[j].Connection == e.detail.connectionClicked){
                        ChartStruc.ModuleList[i].connectionsInputs.splice(j, 1);
                        ChartStruc.ModuleList[i].connectionsInputs=ChartStruc.ModuleList[i].connectionsInputs;
                    }
                }
            }
            //retirar conexao do modulo externo
            if(ChartStruc.ModuleList[i].connectionsOutputs !== undefined){
                for(let j=0; j<ChartStruc.ModuleList[i].connectionsOutputs.length; j++){
                    if(ChartStruc.ModuleList[i].connectionsOutputs[j].Connection == e.detail.connectionClicked){
                        ChartStruc.ModuleList[i].connectionsOutputs.splice(j, 1);
                        ChartStruc.ModuleList[i].connectionsOutputs=ChartStruc.ModuleList[i].connectionsOutputs;
                    }
                }
            }
        }

        //retirr do Final connextions do canvas que é o que representa graficamente
        let index = ChartStruc.FinalConnections.indexOf(e.detail.connectionClicked);
        if (index > -1) {
            ChartStruc.FinalConnections.splice(index, 1);
        }
        ChartStruc.FinalConnections=ChartStruc.FinalConnections;

	}
	const handleDblClickModule = (e) => {
        //History
        __HistoryChart.addState(ChartStruc.toJSON());

        let moduleClicked = e.detail.moduleClicked;
        let moduleClickedInputConnections = e.detail.moduleClicked.connectionsInputs;
        let moduleClickedOutputConnections = e.detail.moduleClicked.connectionsOutputs;
        let moduleList = ChartStruc.ModuleList;
        let finalConnections = ChartStruc.FinalConnections;



        //se tem ligacoes nos inputs
        if(moduleClickedInputConnections){
            for(let a=0; a<moduleClickedInputConnections.length; a++){
                //cannot  go inside details of connections inputs like external module-> return undefineds              
                for(let i=0; i<moduleList.length; i++){
                    //retirar conexao do modulo externo
                    if(moduleList[i].connectionsOutputs !== undefined){
                        for(let j=0; j<moduleList[i].connectionsOutputs.length; j++){
                            if(moduleList[i].connectionsOutputs[j].Connection == moduleClickedInputConnections[a].Connection){
                                moduleList[i].connectionsOutputs.splice(j, 1);
                                moduleList[i].connectionsOutputs=moduleList[i].connectionsOutputs;
                            }
                        }
                    }
                }
               //delete from final connections
                let index = finalConnections.indexOf(moduleClickedInputConnections[a].Connection);
                if (index > -1) {
                    finalConnections.splice(index, 1);
                }


            }
        }



        //se tem ligacoes nos outputs\
        if(moduleClickedOutputConnections){
            for(let a=0; a<moduleClickedOutputConnections.length; a++){
                //cannot  go inside details of connections inputs like external module-> return undefineds
                for(let i=0; i<moduleList.length; i++){
                    //retirar conexao do modulo externo
                    if(moduleList[i].connectionsInputs !== undefined){
                        
                        for(let j=0; j<moduleList[i].connectionsInputs.length; j++){
                            if(moduleList[i].connectionsInputs[j].Connection == moduleClickedOutputConnections[a].Connection){
                                moduleList[i].connectionsInputs.splice(j, 1);
                                moduleList[i].connectionsInputs=moduleList[i].connectionsInputs;
                            }
                        }
                    }
                }

                //delete from final connections
                let index = finalConnections.indexOf(moduleClickedOutputConnections[a].Connection);
                if (index > -1) {
                    finalConnections.splice(index, 1);
                }finalConnections=finalConnections;
        
            }
        }
        
        
        //ChartStruc.ModuleList.forEach(function(m){console.log(`${m.id}=${m.xPos},${m.yPos}`)})
        for(let i=0; i<moduleList.length; i++){

            if(moduleList[i].id == moduleClicked.id){
                moduleList.splice(i, 1);
                break;
            }
        }
        
        ChartStruc=ChartStruc;

        
    }


    export let left: number;
    export let top: number;


</script>
<svg    use:draggable  
        on:dragmove={handleDragMoveBackground}
        transform={`translate(${Background_dx} ${Background_dy})`} >
	<g>      
            {#each ChartStruc.ModuleList as moduleEntry}
                <FlowModulev2
                    StrucModule={moduleEntry} 
                    on:handleDragEnd={handleDragEnd}
                    on:handleDragMove={handleDragMove}
                    on:handleConnectionStart={handleConnectionStart}
                    on:handleConnectionDrag={handleConnectionDrag}
                    on:handleConnectionEnd={handleConnectionEnd}
                    on:DblclickModule={handleDblClickModule}
                /> 
            {/each}
            {#each connections as connection,i (i)}
                <path d={connection.curve} fill="transparent"/>
            {/each}
            {#each ChartStruc.FinalConnections as connection,i (i)}
                <ConnectionSVG 
                    on:DblclickConnection={handleDblClickConnection}
                    connection={connection}
                    />
            {/each}
            
    </g>
</svg>
<style>
    svg{
        background-color:#b3b3b3;
        width: 1000%; 
        height: 1000% 
    }

    path{
        stroke-width: 5;
        stroke-opacity: 0.5;
        stroke:rgb(0, 0, 0);

    }
	circle { fill: rgb(255, 255, 255); opacity:1;z-index: 1 }
	circle:hover { fill: rgb(255, 255, 255); opacity:1;z-index: 1}
</style>