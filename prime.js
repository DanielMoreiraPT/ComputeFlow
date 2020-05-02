SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function (toElement) {
  return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

let nextUid = 0;
const svg = document.querySelector("#svg");
const diagramElement = document.querySelector("#diagram");

const moduleLock = {};
const portLock = {};
const connectorLock = {};

const ports = [];
const modules = [];
const connectorList = [];

const dragProxy = document.querySelector("#drag-proxy"); 
const moduleElements = Array.from(document.querySelectorAll(".node-container"));


const frag = document.createDocumentFragment();
frag.appendChild(document.querySelector(".connector"));

const connectorElement = frag.querySelector(".connector");
const connectorLayer = document.querySelector("#connections-layer");

function splitString(stringToSplit, separator) {
  let arrayOfStrings = stringToSplit.split(separator);
  return arrayOfStrings;
}


class Connector {

  constructor() {

    this.id = `connector_${nextUid++}`;
    this.dragType = "connector";
    this.isSelected = false;
    this.element = connectorElement.cloneNode(true);
    var divNova = document.createElement("a"); 
    this.element.appendChild(divNova);
    //console.log(this.element);


    this.path = this.element.querySelector(".connector-path");
    this.pathOutline = this.element.querySelector(".connector-path-outline");
    this.inputHandle = this.element.querySelector(".input-handle");
    this.outputHandle = this.element.querySelector(".output-handle");
  }

  init(port) {
    //console.log("Tipo: "+port.portType)
    connectorLayer.appendChild(this.element);

    this.isInput = port.isInput;

    if (port.isInput) {
      this.inputPort = port;
      this.dragElement = this.outputHandle;
      this.staticElement = this.inputHandle;
    } else {
      this.outputPort = port;
      this.dragElement = this.inputHandle;
      this.staticElement = this.outputHandle;
    }

    this.staticPort = port;
    this.dragElement.setAttribute("data-drag", `${this.id}:connector`);
    this.staticElement.setAttribute("data-drag", `${port.id}:port`);

    TweenLite.set([this.inputHandle, this.outputHandle], {
      x: port.global.x,
      y: port.global.y });



  }

  updatePath() {

    const x1 = this.inputHandle._gsTransform.x;
    const y1 = this.inputHandle._gsTransform.y;

    const x4 = this.outputHandle._gsTransform.x;
    const y4 = this.outputHandle._gsTransform.y;

    const dx = Math.abs(x1 - x4);

    const p1x = x1;
    const p1y = y1;

    const p2x = x1 - dx;
    const p2y = y1;

    const p4x = x4;
    const p4y = y4;

    const p3x = x4 + dx;
    const p3y = y4;

    const data = `M${p1x} ${p1y} C ${p2x} ${p2y} ${p3x} ${p3y} ${p4x} ${p4y}`;

    this.path.setAttribute("d", data);
    this.pathOutline.setAttribute("d", data);
  }

  updateHandle(port) {

    if (port === this.inputPort) {

      TweenLite.set(this.inputHandle, {
        x: port.global.x,
        y: port.global.y });


    } else if (port === this.outputPort) {

      TweenLite.set(this.outputHandle, {
        x: port.global.x,
        y: port.global.y });

    }

    this.updatePath();
  }

  placeHandle() {
      const skipmodule = this.staticPort.parentNode.element;

      let hitPort;

      for (let module of modules) {

        if (module.element === skipmodule) {
          continue;
        }

        if (Draggable.hitTest(this.dragElement, module.element)) {

          const ports = this.isInput ? module.outputs : module.inputs;

          for (let port of ports) {

            if (Draggable.hitTest(this.dragElement, port.portElement)) {
              
              if(port.portType === this.staticPort.portType){

                hitPort = port;
                break;
              }else{
                alert("Port types are different -.-");
              }
              break;
            }
          }

          if (hitPort) {
            break;
          }
        }
      }

      if (hitPort) {

        if (this.isInput) {
          this.outputPort = hitPort;
        } else {
          this.inputPort = hitPort;
        }

        this.dragElement.setAttribute("data-drag", `${hitPort.id}:port`);

        hitPort.addConnector(this);
        this.updateHandle(hitPort);

      } else {
        this.remove();
      }

  }

  remove() {

    if (this.inputPort) {
      this.inputPort.removeConnector(this);
    }

    if (this.outputPort) {
      this.outputPort.removeConnector(this);
    }

    this.isSelected = false;

    this.path.removeAttribute("d");
    this.pathOutline.removeAttribute("d");
    this.dragElement.removeAttribute("data-drag");
    this.staticElement.removeAttribute("data-drag");

    this.staticPort = null;
    this.inputPort = null;
    this.outputPort = null;
    this.dragElement = null;
    this.staticElement = null;

    connectorLayer.removeChild(this.element);

    connectorList.push(this);

  }

  onDrag() {

    if(this.staticPort != null){
      this.updatePath();
    }
  }

  onDragEnd() {
    if(this.staticPort != null){
      this.placeHandle();
    }
  }}
class NodePort {

  constructor(parentNode, element, isInput) {
    let fullname =element.querySelector(".port-label").textContent;
    var fullnamesplited = splitString(fullname, ' ');
    this.portType=fullnamesplited[0];
    this.VarName=fullnamesplited[1];

    //console.log(this.portType)
    //console.log(this.VarName)

    //size of the name so we can ajust modules sizes
    this.nameSize = fullname.length;

    this.id = `port_${nextUid++}`;
    this.dragType = "port";

    this.parentNode = parentNode;
    this.isInput = isInput;



    this.element = element;
    this.portElement = element.querySelector(".port");
    this.portScrim = element.querySelector(".port-scrim");

    this.portScrim.setAttribute("data-drag", `${this.id}:port`);

    this.connectors = [];
    this.lastConnector;

    const bbox = this.portElement.getBBox();
    
    this.global = svg.createSVGPoint();
    this.center = svg.createSVGPoint();
    this.center.x = bbox.x + bbox.width / 2;
    this.center.y = bbox.y + bbox.height / 2;

    this.update();
  }

  createConnector() {

    let connector;

    if (connectorList.length) {
      connector = connectorList.pop();
      connectorLock[connector.id] = connector;
    } else {
      connector = new Connector();
    }

    connector.init(this);
    this.lastConnector = connector;
    this.connectors.push(connector);
  }

  removeConnector(connection) {

    const index = this.connectors.indexOf(connection);

    if (index > -1) {
      this.connectors.splice(index, 1);
    }
  }

  addConnector(connection) {
    this.connectors.push(connection);
  }

  update() {

    const transform = this.portElement.getTransformToElement(diagramElement);
    this.global = this.center.matrixTransform(transform);

    for (let connector of this.connectors) {
      connector.updateHandle(this);
    }
  }}
class NodeModule {

  constructor(element, x, y) {

    this.id = `module_${nextUid++}`;
    this.dragType = "module";
    this.name = "";
    this.functionId = "";
    element.setAttribute("data-drag", `${this.id}:module`);



    this.element = element;
    this.dragElement = element;

    TweenLite.set(element, { x, y });

    const inputElements = Array.from(element.querySelectorAll(".input-field"));
    const outputElements = Array.from(element.querySelectorAll(".output-field"));

    this.inputs = inputElements.map((element) => {
      const port = new NodePort(this, element, true);
      portLock[port.id] = port;
      ports.push(port);
      return port;
    });

    this.outputs = outputElements.map((element) => {
      const port = new NodePort(this, element, false);
      portLock[port.id] = port;
      ports.push(port);
      return port;
    });
  }

  onDrag() {

    for (let input of this.inputs) {
      input.update();
    }

    for (let output of this.outputs) {
      output.update();
    }
  }}   
class Chart {

  constructor() {

    this.dragElement = this.element = diagramElement;
    
    this.target = null;
    this.dragType = null;

    this.dragTarget = this.dragTarget.bind(this);
    this.prepareTarget = this.prepareTarget.bind(this);
    //console.log("prep");
    this.stopDragging = this.stopDragging.bind(this);

    this.draggable = new Draggable(dragProxy, {
      allowContextMenu: true,
      trigger: svg,
      onDrag: this.dragTarget,
      onDragEnd: this.stopDragging,
      onPress: this.prepareTarget });

  }

  stopDragging() {
    this.target.onDragEnd && this.target.onDragEnd();
    // const chart = document.querySelector(".chart");
    // const bin = document.querySelector("#bin");

    // if (Draggable.hitTest(".node-container", "#bin")){
    //    alert("hit!!");

    //   console.log("target"+this.target.dragElement);
    //   TweenLite.to(this.target.dragElement,1, {opacity:0});
      
    // }
  }

  prepareTarget(event) {
    let element = event.target;
    console.log(element);
    let drag;


    //avaliar se se tira ligacao(carregar na ligacao)
    if(element.tagName=="path"){
      element.id="olaaa";
      let d = document.getElementById("olaaa").getAttribute("d");
      let resultado = d.split(" ");
      //Coordx Coordy of the input handle
      //M123 456
      let inputCoordxtemp = resultado[0];
      let inputCoordx = inputCoordxtemp.substr(1);
      let inputCoordy = resultado[1];
      //console.log("Input Coords: "+inputCoordx + ":" + inputCoordy);
      element.id="ola";

      let outputCoordx = resultado[7];
      let outputCoordy = resultado[8];
      //console.log("Output Coords: "+outputCoordx + ":" + outputCoordy);

      let i;
      for(i=0; i<modules.length; i++){
        //Get Coordinates of modules
        let ModuleMatrix = modules[i].element.getAttribute("transform");
        //console.log(ModuleMatrix);
        let temp = ModuleMatrix.substr(15);
        var ola = splitString(temp, ',');
        let Coordx = ola[0];
        let Coordy = splitString(ola[1], ')')[0];
        //width of the module--> default for now
        let width = 200; //? confirm
        //height of the module--> 50+(25*max modules on one side)
        let height;
        let max = 75;
        
        if(modules[i].inputs.length > modules[i].outputs.length){
            max = modules[i].inputs.length;
          }else{
            max = modules[i].outputs.length;
          }
        
        height = 50+(25*max)
        //coord opposite of the module (opposite corner from COordx and Coordy)
        let oppositeCoordx = parseInt(Coordx)+parseInt(width);
        let oppositeCoordy = parseInt(Coordy)+parseInt(height);

        //console.log("Width: "+ width + ", Height: " + height );
        //console.log("Module "+i+" coords: " + Coordx + " : " + Coordy); 
        //console.log("Module "+i+" finalcoords: " + oppositeCoordx + " : " + oppositeCoordy);
        let portNumber = -1;
        if((inputCoordx >= Coordx & inputCoordx <= oppositeCoordx)&(inputCoordy>= Coordy & inputCoordy <= oppositeCoordy)){
          let j
          //search for the coords of the input port untill we have a match.. we cant do it any other way since its a path tag
          let portHeight = parseInt(Coordy)+60;  //60->module header size
          for(j=0; j<modules[i].inputs.length; j++){
            //does the height from the input handler matches the port?
            if(portHeight == inputCoordy){
              //console.log("port height: "+portHeight);
              //console.log("Match on port "+j);
              portNumber=j;
              break;
            }else{
              portHeight+=25;
            }
          }
        }
        //se foi atribuida alguma porta
        if(portNumber > -1){
          //como a cardinalidade de cada porta, pode variar temos de procurar qual e a conexao nessa porta
          let h;
          for(h=0;h<modules[i].inputs[portNumber].connectors.length;h++){
            if(modules[i].inputs[portNumber].connectors[h].outputPort.global["x"]==outputCoordx & modules[i].inputs[portNumber].connectors[h].outputPort.global["y"]==outputCoordy ){
              //console.log("e a ligacao: "+h);
              modules[i].inputs[portNumber].connectors[h].remove();
              //alert("eliminou a ligacao");
            }else{
              //console.error("Erro: porta nao encontrada no modulo suposto");
            }
            break;
          }
        }


      }
    }
    else{

      while (!(drag = element.getAttribute("data-drag")) && element !== svg) {
        if (window.CP.shouldStopExecution(0)){
          break;
        } 
        element = element.parentNode;
      }
      window.CP.exitedLoop(0);
      
      drag = drag || "diagram:diagram";
      const split = drag.split(":");  
      const id = split[0];
      const dragType = split[1];
      
      console.log(dragType);
      switch (dragType) {
        case "diagram":
          this.target = this;
          break;
  
        case "module":
          this.target = moduleLock[id];
          break;
  
        case "port":
          const port = portLock[id];
          //TODO ver cardinalidade com o professor
          if(port.connectors.length < 2){
            port.createConnector();
            this.target = port.lastConnector;
            this.dragType = this.target.dragType;
            break;
          }else{
            //alert("Max cardinality reached");
            console.log("Max cardinality reached");
            break;
          }
        case "connector":
          console.log("sup");
          this.target = connectorLock[id];
          break;}
  
    }


  }

    //function used in dragTarget() to detect a colision
  checkHit() { 
    var overlapTreshold = "70%";
    if (Draggable.hitTest(".chart", "#bin",overlapTreshold)){ // gsap colision function, to check if the module is near the bin container
       return true;
    }
  }


  dragTarget() {
    //console.log(this.target)
    //console.log(modules[0]);
    //console.log(modules[0].outputs[0].connectors[0]);
    //modules[0].outputs[0].connectors[0].remove();

    if(this.target ==="undefined"){
      return;
    }else if(this.target.dragType==="connector" && this.target.inputPort===null && this.target.outputPort===null){
      return;
    }else{
      TweenLite.set(this.target.dragElement, {
        x: `+=${this.draggable.deltaX}`,
        y: `+=${this.draggable.deltaY}` });


      this.target.onDrag && this.target.onDrag();
    }

    if (this.checkHit()){ // colision function, to check if the node is near the bin
      
       
      //remove module data structures here ( clear all deleted module's data ) 

       for(let i=0;i<modules.length; i++){
        
        //console.log(modules[i].outputs[i].length);
           
        
        //remove the soon to be deleted node from 'modules' data structure
        var NodeID = getTargetID(this.target);
        if(NodeID === modules[i].id){
          //console.log(modules[i]);
          // search for connectors in output ports and consequently remove them
          for (let PortNumber=0; PortNumber < modules[i].outputs.length; PortNumber++){
          //console.log(PortNumber);
            for(let h=0;h<modules[i].outputs[PortNumber].connectors.length;h++){
              //console.log(h);
              //console.log(modules[i].outputs[PortNumber].connectors[h]);
              modules[i].outputs[PortNumber].connectors[h].remove()
            }
          }

        // search for connectors in input ports and consequently remove them
          for (let PortNumber=0; PortNumber < modules[i].inputs.length; PortNumber++){
            //console.log(PortNumber);
            for(let h=0;h<modules[i].inputs[PortNumber].connectors.length;h++){
              //console.log(h);
              modules[i].inputs[PortNumber].connectors[h].remove();
            }
          }
          modules.splice(i, 1)
        }


        // test to know if the node was really deleted
        // console.log("modules" + modules.length);
        // console.log(modules[i]);
        
      }

      /*fade the deleted node(0.6sec to fade away)*/    
      TweenLite.to(this.target.dragElement,0.6, {opacity:0,scale:0, svgOrigin:"675px 143px"}); 
       //console.log("target"+this.target.dragElement);
        

      //alert('trigerred rmHTML ');
         var node = this.target;
         //console.log(node);
         var NodeID = getTargetID(node);
         var elmnt = this.target.element;
         elmnt.id = NodeID;
         //console.log("Module_id---------->"+NodeID);
         var SVGcontainer = document.getElementById(NodeID); 
        
         console.log(SVGcontainer);
         
    
         SVGcontainer.remove();
         
        
      alert("Module removed !!");


      function getTargetID(node) {
        //console.log(node);
        var NodeID = node.id;
        return NodeID;
      }

     

      }
     
  }}

const chart = new Chart();



function createConnections(data){
    
  let counterModulos;
  for(counterModulos=0;counterModulos<data.Modules.length; counterModulos++){
  
    //criar ligacões entre modulos a partir do JSON
    let h;
    //se o moduo tem ligacoes que saiam dos seus inputs
    if(data.Modules[counterModulos].Connections.Inputs){
      for(h=0;h<data.Modules[counterModulos].Connections.Inputs.length; h++){
        //console.log(data.Modules[counterModulos].Connections.Inputs);
        let ownInputPort = data.Modules[counterModulos].Connections.Inputs[h].InputPort;
        let outputModule = data.Modules[counterModulos].Connections.Inputs[h].ModuleID;
        let outputModulePort = data.Modules[counterModulos].Connections.Inputs[h].ModulePort;
        //console.log("Own Input Port: " + ownInputPort);
        //console.log("Module connected to this port " + outputModule);
        //console.log("Port on that modules used: "+outputModulePort);
       
       
        let connector = new Connector();
        let InputPort = modules[counterModulos].inputs[ownInputPort];
        connector.init(InputPort);

        InputPort.lastConnector = connector;
        InputPort.connectors.push(connector);
        connector.updateHandle(InputPort);
        //place handle()
        let OutputPort = modules[outputModule].outputs[outputModulePort];
        //console.log(OutputPort);
        
        OutputPort.addConnector(connector);
        
        connector.outputPort = OutputPort;
        connector.updateHandle(OutputPort);

        //console.log("Connector: ");
        //console.log(connector);


      }
    }


  }                                                                                                                                                    
};

readTextFile("foo.json", function(text){
const data = JSON.parse(text);
document.getElementById("ProjectName").innerHTML = data.title;

let counterModulos;
for(counterModulos=0;counterModulos<data.Modules.length; counterModulos++){

  let n_inputs ;
  let n_outputs ;
  let maximo;

  //console.log(data.Modules[counterModulos].IO.Outputs);
  n_inputs = data.Modules[counterModulos].IO.Inputs.length;
  n_outputs = data.Modules[counterModulos].IO.Outputs.length;
  
  maximo = n_inputs >= n_outputs ?  n_inputs : n_outputs;
  let height = (maximo*14)+((maximo+1)*10);
  
  

  //know the width of the module
  let maxInputSize = 0;
  let maxOutputSize = 0;


  let ii;
  for(ii=0; ii<data.Modules[counterModulos].IO.Inputs.length;ii++){
  let portType = data.Modules[counterModulos].IO.Inputs[ii].PortType;
  let VarName = data.Modules[counterModulos].IO.Inputs[ii].VarName;
  let totalsize = parseInt(portType.length)+parseInt(VarName.length);

  if(maxInputSize<totalsize){
      maxInputSize=totalsize;
  }
  }
  let iii;
  for(iii=0; iii<data.Modules[counterModulos].IO.Outputs.length;iii++){
  let portType = data.Modules[counterModulos].IO.Outputs[iii].PortType;
  let VarName = data.Modules[counterModulos].IO.Outputs[iii].VarName;
  let totalsize = parseInt(portType.length)+parseInt(VarName.length);
  

  if(maxOutputSize<totalsize){
      maxOutputSize=totalsize;
  }
  }
  let moduleWidth = 50+parseInt(maxInputSize)*5+50+parseInt(maxOutputSize)*5+50;
  let novoModuloHTML ="";
  novoModuloHTML+='<g class="node-container"><rect class="node-background" width="'+moduleWidth+'" height="128" x="0" y="0" rx="6" ry="6" /><g class="node-header"><rect class="header-round-rect" width="'+moduleWidth+'" height="40" x="2" y="2" rx="4" ry="4" /><rect class="header-rect" width="'+moduleWidth+'" height="36" x="2" y="6" /><text class="header-title" x="'+(moduleWidth*3)/7+'" y="30">'+data.Modules[counterModulos].Name+'</text></g><g class="node-content"><rect class="content-round-rect" width="'+moduleWidth+'" height="'+height+'" x="2" y="44" rx="4" ry="4" /><rect class="content-rect" width="'+moduleWidth+'" height="77" x="2" y="44" /><g class="inputs">';


  let i;
  for(i=0;i<n_inputs; i++){
  //TODO ver ids para portos
  let portType = data.Modules[counterModulos].IO.Inputs[i].PortType;
  let VarName = data.Modules[counterModulos].IO.Inputs[i].VarName;
  let transformValue = 50+(25*i);
  let novoInput = '<g class="input-field" transform="translate(0,'+transformValue+')"><g class="port"><circle class="port-outer" cx="15" cy="10" r="7.5" /><circle class="port-inner" cx="15" cy="10" r="5" /><circle class="port-scrim" cx="15" cy="10" r="7.5" /></g><text class="port-label" x="28" y="14">'+portType+" "+VarName+'</text></g>';
  novoModuloHTML+=novoInput;
  //console.log(novoInput);
  }
  novoModuloHTML+="</g>";
  novoModuloHTML+='<g class="outputs">';
  
  let j;
  for(j=0;j<n_outputs; j++){
  //TODO ver ids para portos
  let portType = data.Modules[counterModulos].IO.Outputs[j].PortType;
  let VarName = data.Modules[counterModulos].IO.Outputs[j].VarName;
  let transformValue = 50+(25*j);
  let outer = moduleWidth-11;
  let inner = moduleWidth-26;
  let novoOutput = '<g class="output-field" transform="translate(0,' +transformValue+')"><g class="port" data-clickable="false"><circle class="port-outer" cx="'+outer+'" cy="10" r="7.5" /><circle class="port-inner" cx="'+outer+'" cy="10" r="5" /><circle class="port-scrim" cx="'+outer+'" cy="10" r="7.5" data-clickable="false" /></g><text class="port-label" x="'+inner+'" y="14">'+portType+" "+VarName+'</text></g>';
  novoModuloHTML+=novoOutput;
  //console.log(novoOutput);
  }

  novoModuloHTML+="</g></g></g>";

  var divNova = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  divNova.setAttribute("class", "node-container");
  divNova.innerHTML = novoModuloHTML;
  

  let coordx=data.Modules[counterModulos].Coord.CoordX;
  let coordy=data.Modules[counterModulos].Coord.CoordY;
  document.getElementById("node-layer").appendChild(divNova);
  const module = new NodeModule(divNova,coordx, coordy);
  module.name = data.Modules[counterModulos].Name;
  module.functionId = data.Modules[counterModulos].Id;
  moduleLock[module.id] = module;
  modules.push(module);




}
createConnections(data);
});


const app = require("electron").remote;
var dialog = app.dialog;
var fs = require("fs");

document.getElementById('save_project').onclick=() => {    
  //trying to get info from svg so later we can send through json
  //write a json file
  const writeJsonFile = require('write-json-file');


  var obj = {
    "title":"New Project Name",
    "Modules":[

    ]

  }
  let i;
  if(modules.length){
    for(i=0;i<modules.length;i++){
    let module_obj = {
      "Name":modules[i].name,
      "Id":i.toString(),
      "Coord":{
          "CoordX":modules[i].element.transform.baseVal[0].matrix.e.toString(),
          "CoordY":modules[i].element.transform.baseVal[0].matrix.f.toString()
      },
      "FunctionID":modules[i].functionId,
      "IO":{
        "Inputs":[

        ],
        "Outputs":[

        ]
      },
      "Connections":{
        "Inputs":[
        ]
      }
    }
    let j;
    for( j=0; j<modules[i].inputs.length; j++){
      let inputPortObj = {
        "PortID":j.toString(),
        "PortType":modules[i].inputs[j].portType,
        "VarName":modules[i].inputs[j].VarName
      }

      module_obj["IO"]["Inputs"].push(inputPortObj);

      
      
      let g;
      //alterar se a cardinalidade for para ser alterada

      if(modules[i].inputs[j].connectors.length>0){
        let ModuleIdOnModule=modules[i].inputs[j].connectors[0].outputPort.parentNode.id;
        let ModuleId;
        let ModulePort;

        //modulo -> corresponde ao modulo a qual a conexao vai ser feita
        //determinar o Id do modulo (corresponde à posicao do modulo no array)
        let temp;
        for(temp=0;temp<modules.length; temp++){
          if(modules[temp].id==ModuleIdOnModule){
            ModuleId=temp;
          }
        }
        
        //determinar o Id da porta do modulo (corresponde à posicao da porta no array)
        let temp2;
        for(temp2=0;temp2<modules[ModuleId].outputs.length; temp2++){
          if(modules[ModuleId].outputs[temp2].id==modules[i].inputs[j].connectors[0].outputPort.id){
            ModulePort= temp2;
          }
        }

        let connectionObj = {
                "ModuleID":ModuleId.toString(),
                "ModulePort":ModulePort.toString(),
                "InputPort":j.toString()		
          }
        module_obj["Connections"]["Inputs"].push(connectionObj);
      }


    }

    let h;
    for(h=0; h<modules[i].outputs.length; h++){
      let outputPortObj = {
        "PortID":h.toString(),
        "PortType":modules[i].outputs[h].portType,
        "VarName":modules[i].outputs[h].VarName
      }
      module_obj["IO"]["Outputs"].push(outputPortObj);
    }

    obj["Modules"].push(module_obj);
  }

  
  //var json = JSON.stringify(obj);
  //console.log(json);
  
  }
  
  (async () => {
      await writeJsonFile('foo.json', obj);
  })();
  
  
  
};


//enable user to create modules from previous templates
//get Var and FunctionTemplates
var scope_for_functions = {};
var scope_for_vars = {};
var ListVarTemplates = [];
var ListFunctionTemplates = [];

class VarTemplate {
  constructor(name, TypeId) {
    this.name=name;
    this.typeId=TypeId;
    this.Outputs = [];
  }
}
class FunctionTemplate {
  constructor(name, FunctionID) {
    this.name=name;
    this.FunctionID=FunctionID;
    this.Inputs = [];
    this.Outputs = [];
  }
}
class IOTemplate {
  constructor(PortID, PortType, VarName) {
    this.PortID=PortID;
    this.PortType=PortType;
    this.VarName=VarName;
  }
}


readTextFile("ModulesTemplate.json", function(text){
  let data = JSON.parse(text);

  let i;
  //for vars/objects
  for(i=0;i<data.Templates.Variables.length; i++){
    let variable;
    variable = new VarTemplate(data.Templates.Variables[i].Name, data.Templates.Variables[i].Id);
    
    let j;
    for(j=0; j<data.Templates.Variables[i].IO.Outputs.length; j++){
      let output = new IOTemplate(data.Templates.Variables[i].IO.Outputs[j].PortID, data.Templates.Variables[i].IO.Outputs[j].PortType,data.Templates.Variables[i].IO.Outputs[j].VarName);
      variable.Outputs.push(output);
    }

    ListVarTemplates.push(variable);
  }


  //for fucntions

  for(i=0;i<data.Templates.Functions.length; i++){
    let functionObject;
    functionObject = new FunctionTemplate(data.Templates.Functions[i].Name, data.Templates.Functions[i].FunctionID);

    let j;
    for(j=0; j<data.Templates.Functions[i].IO.Inputs.length; j++){
      let input = new IOTemplate(data.Templates.Functions[i].IO.Inputs[j].PortID, 
                                       data.Templates.Functions[i].IO.Inputs[j].PortType,
                                       data.Templates.Functions[i].IO.Inputs[j].VarName);
     
      functionObject.Inputs.push(input);
    }
    for(j=0; j<data.Templates.Functions[i].IO.Outputs.length; j++){
      let output = new IOTemplate(data.Templates.Functions[i].IO.Outputs[j].PortID, 
                                  data.Templates.Functions[i].IO.Outputs[j].PortType,
                                  data.Templates.Functions[i].IO.Outputs[j].VarName);
      
      functionObject.Outputs.push(output);
    }
    ListFunctionTemplates.push(functionObject);
  }
  


  createTemplatesOptions();
  });

function createEspecificTemplate(templateType,id){
    let n_inputs ;
    let n_outputs ;
    let maximo;
    let typeId;
    let name;
    
    let Moduleid;
    if(templateType=="var"){
      //Criar variavel
      let i;
      for(i=0; i<ListVarTemplates.length; i++){
        typeId  = id.substring(3);
        if(ListVarTemplates[i].typeId == typeId){
          //we have a match
          n_outputs=ListVarTemplates[i].Outputs.length;
          name=ListVarTemplates[i].name; //we need to have an option so we can name this module
          //maior numero de portas para height
          maximo=n_outputs;
          let height = (maximo*14);
          
          //know the width of the module
          let maxOutputSize = 0;
          
          let iii;
          for(iii=0; iii<ListVarTemplates[i].Outputs.length;iii++){
            let portType = ListVarTemplates[i].Outputs[iii].PortType;
            let VarName = ListVarTemplates[i].Outputs[iii].VarName;
            let totalsize = parseInt(portType.length)+parseInt(VarName.length);
            

            if(maxOutputSize<totalsize){
              maxOutputSize=totalsize;
            }
          }
          let title_width=parseInt(name.length)*17+20;
          let moduleWidth = 50+parseInt(maxOutputSize)*5+50;
          if(moduleWidth<title_width){
            moduleWidth=title_width;
          }
          let novoModuloHTML ="";
          novoModuloHTML+='<g class="node-container"><rect class="node-background" width="'+moduleWidth+'" height="128" x="0" y="0" rx="6" ry="6" /><g class="node-header"><rect class="header-round-rect" width="'+moduleWidth+'" height="40" x="2" y="2" rx="4" ry="4" /><rect class="header-rect" width="'+moduleWidth+'" height="36" x="2" y="6" /><text class="header-title" x="'+(moduleWidth*3)/7+'" y="30">'+name+'</text></g><g class="node-content"><rect class="content-round-rect" width="'+moduleWidth+'" height="'+height+'" x="2" y="44" rx="4" ry="4" /><rect class="content-rect" width="'+moduleWidth+'" height="77" x="2" y="44" />';
  
          novoModuloHTML+='<g class="outputs">';
    
          let j;
          for(j=0;j<n_outputs; j++){
            //TODO ver ids para portos
            let portType = ListVarTemplates[i].Outputs[j].PortType;
            let VarName = ListVarTemplates[i].Outputs[j].VarName;
            let transformValue = 50+(25*j);
            let outer = moduleWidth-11;
            let inner = moduleWidth-26;
            let novoOutput = '<g class="output-field" transform="translate(0,' +transformValue+')"><g class="port" data-clickable="false"><circle class="port-outer" cx="'+outer+'" cy="10" r="7.5" /><circle class="port-inner" cx="'+outer+'" cy="10" r="5" /><circle class="port-scrim" cx="'+outer+'" cy="10" r="7.5" data-clickable="false" /></g><text class="port-label" x="'+inner+'" y="14">'+portType+" "+VarName+'</text></g>';
            novoModuloHTML+=novoOutput;
            //console.log(novoOutput);
          }
        
          novoModuloHTML+="</g></g></g>";
        
          var divNova = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          divNova.setAttribute("class", "node-container");
        
        
          
          divNova.innerHTML = novoModuloHTML;

          let modules_list_position = modules.length;      
          let coordx=600;
          let coordy=600;
          document.getElementById("node-layer").appendChild(divNova);
          const modulee = new NodeModule(divNova,coordx, coordy);
          modulee.name = ListVarTemplates[i].name;
          moduleLock[modulee.id] = modulee;
          modules.push(modulee);
        
        }
      }
    }else if(templateType=="function"){
      //Criar funcao
      let i;
      typeId=id.substring(8);
      for(i=0;i<ListFunctionTemplates.length; i++){
        if(ListFunctionTemplates[i].FunctionID == typeId){
          //we have a match
          n_inputs=ListFunctionTemplates[i].Inputs.length;
          n_outputs=ListFunctionTemplates[i].Outputs.length;
          name=ListFunctionTemplates[i].name; //we need to have an option so we can name this module
          //maior numero de portas para height

          maximo = n_inputs >= n_outputs ?  n_inputs : n_outputs;
          let height = (maximo*14)+((maximo+1)*10);

          //know the width of the module
          let maxInputSize = 0;
          let maxOutputSize = 0;

          let ii;
          for(ii=0; ii<ListFunctionTemplates[i].Inputs.length;ii++){
            let portType = ListFunctionTemplates[i].Inputs[ii].PortType;
            let VarName = ListFunctionTemplates[i].Inputs[ii].VarName;
            let totalsize = parseInt(portType.length)+parseInt(VarName.length);

            if(maxInputSize<totalsize){
              maxInputSize=totalsize;
            }
          }

          let iii;
          for(iii=0; iii<ListFunctionTemplates[i].Outputs.length;iii++){
            let portType = ListFunctionTemplates[i].Outputs[iii].PortType;
            let VarName = ListFunctionTemplates[i].Outputs[iii].VarName;
            let totalsize = parseInt(portType.length)+parseInt(VarName.length);
            
            if(maxOutputSize<totalsize){
              maxOutputSize=totalsize;
            }
          }
          let moduleWidth = 50+parseInt(maxInputSize)*5+50+parseInt(maxOutputSize)*5+50;
          let novoModuloHTML ="";
          novoModuloHTML+='<g class="node-container"><rect class="node-background" width="'+moduleWidth+'" height="128" x="0" y="0" rx="6" ry="6" /><g class="node-header"><rect class="header-round-rect" width="'+moduleWidth+'" height="40" x="2" y="2" rx="4" ry="4" /><rect class="header-rect" width="'+moduleWidth+'" height="36" x="2" y="6" /><text class="header-title" x="'+(moduleWidth*3)/7+'" y="30">'+name+'</text></g><g class="node-content"><rect class="content-round-rect" width="'+moduleWidth+'" height="'+height+'" x="2" y="44" rx="4" ry="4" /><rect class="content-rect" width="'+moduleWidth+'" height="77" x="2" y="44" /><g class="inputs">';
          let j;
          for(j=0;j<n_inputs; j++){
            //TODO ver ids para portos
            let portType = ListFunctionTemplates[i].Inputs[j].PortType;
            let VarName = ListFunctionTemplates[i].Inputs[j].VarName;
            let transformValue = 50+(25*j);
            let novoInput = '<g class="input-field" transform="translate(0,'+transformValue+')"><g class="port"><circle class="port-outer" cx="15" cy="10" r="7.5" /><circle class="port-inner" cx="15" cy="10" r="5" /><circle class="port-scrim" cx="15" cy="10" r="7.5" /></g><text class="port-label" x="28" y="14">'+portType+" "+VarName+'</text></g>';
            novoModuloHTML+=novoInput;
          }   

        novoModuloHTML+="</g>";
        novoModuloHTML+='<g class="outputs">';

        for(j=0;j<n_outputs; j++){
          let portType = ListFunctionTemplates[i].Outputs[j].PortType;
          let VarName = ListFunctionTemplates[i].Outputs[j].VarName;
          let transformValue = 50+(25*j);
          let outer = moduleWidth-11;
          let inner = moduleWidth-26;
          let novoOutput = '<g class="output-field" transform="translate(0,' +transformValue+')"><g class="port" data-clickable="false"><circle class="port-outer" cx="'+outer+'" cy="10" r="7.5" /><circle class="port-inner" cx="'+outer+'" cy="10" r="5" /><circle class="port-scrim" cx="'+outer+'" cy="10" r="7.5" data-clickable="false" /></g><text class="port-label" x="'+inner+'" y="14">'+portType+" "+VarName+'</text></g>';
          novoModuloHTML+=novoOutput;
        }
        novoModuloHTML+="</g></g></g>";
        var divNova = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        divNova.setAttribute("class", "node-container");
        divNova.id = "ola";
        divNova.innerHTML = novoModuloHTML;
        let modules_list_position = modules.length;      
        let coordx=600;
        let coordy=600;
        document.getElementById("node-layer").appendChild(divNova);
        const modulee = new NodeModule(divNova,coordx, coordy);
        modulee.name = ListFunctionTemplates[i].name;
        moduleLock[modulee.id] = modulee;
        modules.push(modulee);
      }
    } 

    }


}

function createTemplatesOptions(){
  var sidebar_slot = document.getElementById("homeSubmenu");

  for(i=0; i<ListVarTemplates.length; i++){
    var li = document.createElement("li");
    var a = document.createElement("a");
    //console.log(ListVarTemplates[i])
    a.appendChild(document.createTextNode(ListVarTemplates[i].name));
    li.appendChild(a);
    li.className="VarCreator";
    li.setAttribute("id","var"+ListVarTemplates[i].typeId );
    sidebar_slot.appendChild(li);
  }

  var VarCreators = document.getElementsByClassName("VarCreator");
  let j;
  for (j = 0; j < VarCreators.length; j++) {
    VarCreators[j].addEventListener("click", function() {
      createEspecificTemplate("var", this.id);
    })

  }

  //for function/object modules
  for(i=0; i<ListFunctionTemplates.length; i++){
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.appendChild(document.createTextNode(ListFunctionTemplates[i].name));
    li.appendChild(a);
    li.className="FunctionCreator";
    li.setAttribute("id","function"+ListFunctionTemplates[i].FunctionID );
    sidebar_slot.appendChild(li);
  }
  
  var FunctionCreators = document.getElementsByClassName("FunctionCreator");
  
  for (j = 0; j < FunctionCreators.length; j++) {
    FunctionCreators[j].addEventListener("click", function() {
      createEspecificTemplate("function", this.id);
    })

  }
}
