<script lang="typescript">
    import FlowModule from './FlowModule.svelte'
    import ConnectionSVG from './ConnectionSVG.svelte'
    import { onMount } from 'svelte';
    import { Module, Port, Connection, Chart } from './StructureLogic';
    import { spring } from 'svelte/motion';
	import {draggable} from './draggable.js'
    import { createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();

    export let ChartStruc: Chart;
    
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
                             
                            }
                        }
                    }
                }

            }
            
        }
    }
    //TODO posso nao tar sempre a criar e dar simplesment update as ligacoes
	const handleDragEnd = (e) => {
        let moduleDragged: Module;
        moduleDragged = e.detail.Module;
        
        let dx : number = e.detail.dx.dx;
        let dy : number = e.detail.dy.dy; 
        let lastX : number = e.detail.lastX.lastX;
        let lastY : number = e.detail.lastY.lastY;  
        
        //TODO ma logica a dar coord no modulo
        
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
        connection.setEndPoints(xFinal.xFinal.xFinal-Background_dx, yFinal.yFinal.yFinal-Background_dy);
        connection.calculateCurve();
        connections.push(connection);
        connections=connections;
        
    }
	const handleConnectionDrag = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        connections=[];
        //TODO id da conexao dinamicamente
        let connection = new Connection('tentativa', port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);
        connection.setEndPoints( xFinal.xFinal.xFinal-Background_dx, yFinal.yFinal.yFinal-Background_dy);
        connection.calculateCurve();
        connections.push(connection);
        connections=connections;
    }
	const handleConnectionEnd = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        connections=[];
        verifyCoordsIsPortFromType(xFinal.xFinal.xFinal-Background_dx, yFinal.yFinal.yFinal-Background_dy, port.port.port.port, parentModule.StrucModule)
    }
	const handleDblClickConnection = (e) => {
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
        console.log("eliminar module plss")
        console.log(e.detail.moduleClicked)
        //TODO
        //1st, delete all the connections associated
        //se tem ligacoes nos inputs
        if(e.detail.moduleClicked.connectionsInputs){
            for(let a=0; a<e.detail.moduleClicked.connectionsInputs.length; a++){
                //cannot  go inside details of connections inputs like external module-> return undefineds
                
                for(let i=0; i<ChartStruc.ModuleList.length; i++){
                    //retirar conexao do modulo externo
                    if(ChartStruc.ModuleList[i].connectionsOutputs !== undefined){
                        for(let j=0; j<ChartStruc.ModuleList[i].connectionsOutputs.length; j++){
                            if(ChartStruc.ModuleList[i].connectionsOutputs[j].Connection == e.detail.moduleClicked.connectionsInputs[a].Connection){
                                ChartStruc.ModuleList[i].connectionsOutputs.splice(j, 1);
                                ChartStruc.ModuleList[i].connectionsOutputs=ChartStruc.ModuleList[i].connectionsOutputs;
                            }
                        }
                    }
                }
                //delete from final connections
                
                let index = ChartStruc.FinalConnections.indexOf(e.detail.moduleClicked.connectionsInputs[a].Connection);
                if (index > -1) {
                    ChartStruc.FinalConnections.splice(index, 1);
                }
                ChartStruc.FinalConnections=ChartStruc.FinalConnections;
                
                
                //delete from the clicked module
                for(let j=0; j<e.detail.moduleClicked.connectionsInputs.length; j++){
                    if(e.detail.moduleClicked.connectionsInputs[j].Connection == e.detail.moduleClicked.connectionsInputs[a].Connection){
                        e.detail.moduleClicked.connectionsInputs.splice(j, 1);
                        e.detail.moduleClicked.connectionsInputs=e.detail.moduleClicked.connectionsInputs;
                    }
                }
            }
            

        }
      
        //se tem ligacoes nos outputs\
        if(e.detail.moduleClicked.connectionsOutputs){
            for(let a=0; a<e.detail.moduleClicked.connectionsOutputs.length; a++){
                //cannot  go inside details of connections inputs like external module-> return undefineds
                
                for(let i=0; i<ChartStruc.ModuleList.length; i++){
                    //retirar conexao do modulo externo
                    if(ChartStruc.ModuleList[i].connectionsInputs !== undefined){
                        
                        for(let j=0; j<ChartStruc.ModuleList[i].connectionsInputs.length; j++){
                            if(ChartStruc.ModuleList[i].connectionsInputs[j].Connection == e.detail.moduleClicked.connectionsOutputs[a].Connection){
                                ChartStruc.ModuleList[i].connectionsInputs.splice(j, 1);
                                ChartStruc.ModuleList[i].connectionsInputs=ChartStruc.ModuleList[i].connectionsInputs;
                            }
                        }
                    }
                }
                
                //delete from final connections
                let index = ChartStruc.FinalConnections.indexOf(e.detail.moduleClicked.connectionsOutputs[a].Connection);
                if (index > -1) {
                    ChartStruc.FinalConnections.splice(index, 1);
                }ChartStruc.FinalConnections=ChartStruc.FinalConnections;
        
                //delete from the clicked module
                for(let j=0; j<e.detail.moduleClicked.connectionsOutputs.length; j++){
                    if(e.detail.moduleClicked.connectionsOutputs[j].Connection == e.detail.moduleClicked.connectionsOutputs[a].Connection){
                        e.detail.moduleClicked.connectionsOutputs.splice(j, 1);
                        e.detail.moduleClicked.connectionsOutputs=e.detail.moduleClicked.connectionsOutputs;
                    }
                }
                
            }
            

        }
        
        
        //delete module -> cannot use splice in case i have multiple modules "similares"
        //BUG --> elimina bem o  modulo em termos de chart, mas visualmente um modulo vai para a posicao do kmoduo eliminado
        /*
        dispatch('DeleteModule', {
                    ModuleToBeDeleted: e.detail.moduleClicked
                });
        */
        
        console.log(ChartStruc)
        let newModuleList: Module = [];
        console.log(ChartStruc.ModuleList)
        for(let i=0; i<ChartStruc.ModuleList.length; i++){
            if(ChartStruc.ModuleList[i].id != e.detail.moduleClicked.id){
                newModuleList.push(ChartStruc.ModuleList[i]);
            }
        }
        ChartStruc.ModuleList=newModuleList;
        console.log(newModuleList)
        ChartStruc=ChartStruc;
        
    }
</script>
<svg    use:draggable  
        on:dragmove={handleDragMoveBackground}
        transform={`translate(${Background_dx} ${Background_dy})`} >
	<g>  
            {#each ChartStruc.ModuleList as moduleEntry,i (i)}
                <FlowModule 
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
        background-color: rgb(92, 20, 44);
        width: 1000%; 
        height: 1000% 
    }

    path{
        stroke-width: 5;
        stroke-opacity: 0.5;
        stroke:#ff3e00;

    }
	circle { fill: #ff3e00; opacity:1;z-index: 1 }
	circle:hover { fill: #a50c25; opacity:1;z-index: 1}
</style>