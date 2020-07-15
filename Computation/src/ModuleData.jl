module ModuleData

# Export of Structs and Functions
    # Structs to Export
    export ModuleInfo
    # Functions to Export
    export createModule

    using JSON

# Stucts for Data
    struct Coord
        coordX
        coordY

        # Constructor
        Coord(x,y) = new(x,y)
    end

    struct PortInfo
        port_id
        port_type::String
        channel
        channelName

        # Constructors
        PortInfo(id, type) = new(id, type)
        PortInfo(id, type, channel) = new(id, type, channel)
        PortInfo(id, type, channel, channelName) = new(id, type, channel, channelName)
    end

    struct IOinfo
        inputs::Array{PortInfo, 1}
        outputs::Array{PortInfo, 1}

        # Constructor
        IOinfo(input_array, output_array) = new(input_array, output_array)
    end

    struct ConnectModuleInfo
        module_id
        module_port
        input_port

        # Constructor
        ConnectModuleInfo(module_id, module_port, input_port) = new(module_id, module_port, input_port)
    end

    struct ConnectionInfo
        inputs::Array{ConnectModuleInfo, 1}
        outputs::Array{ConnectModuleInfo, 1}

        # Constructor
        ConnectionInfo(inputs, outputs) = new(inputs, outputs)
    end

    struct ModuleInfo
        id
        coords::Coord
        functionid
        name
        io::IOinfo
        connections
        variables

        # Constructors
        ModuleInfo(id, coords, functionid, name,  io, connections, variables) = new(id, coords, functionid, name, io, connections, variables)
    end

    function createModule(data)
        id = get(data,"Id",missing) + 1
        coords = getCoords(get(data, "Coord",missing))
        functionid = get(data,"FunctionID", missing)
        name = get(data, "Name", missing)
        io = getIOinfo(get(data,"IO", missing), id, functionid)
        connections = getConnectionInfo(get(data, "Connections",missing))
        # options = "Computation/Options_files/" * functionid_name * string(functionid) * "_options.json"
        #variables = getVariables(dataDict, functionid-1)
        variables = get(data, "Variables", missing)

        module_info = ModuleInfo(id, coords, functionid, name, io, connections, variables)

        return module_info
    end

# Functions

    function getVariables(dataDict, id)
        for d in get(dataDict,"Modules",missing)
            if get(d, "Id", missing) == id
                println(get(d, "Variables", missing))
                return  get(d, "Variables", missing)
            end
        end
        return missing
    end

    function getConnectionInfo(dict)

        inputs = []
        for input in get(dict, "Inputs",missing)
            #Julia check left side first, if it's false don't check rest
            (input === missing) && throw(ErrorException("Missing IO information."))

            moduleid = get(input, "ModuleID",missing) + 1
            moduleport = get(input, "ModulePort", missing)+ 1
            inputport = get(input, "InputPort", missing)+ 1
            if moduleid === missing || moduleport === missing || inputport === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(inputs, ConnectModuleInfo(moduleid, moduleport, inputport))
        end

        outputs = []
        for output in get(dict, "Outputs",missing)
            #Julia check left side first, if it's false don't check rest
            output === missing && throw(ErrorException("Missing IO information."))

            moduleid = get(output, "ModuleID",missing)+ 1
            moduleport = get(output, "ModulePort", missing)+ 1
            outputport = get(output, "OutputPort", missing)+ 1
            if moduleid === missing || moduleport === missing || outputport === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(outputs, ConnectModuleInfo(moduleid, moduleport, outputport))
        end
        ConnectionInfo(inputs, outputs)
    end

    function getIOinfo(dict, id, functionid)
        inputs = []
        for input in get(dict, "Inputs", missing)
            input === missing && throw(ErrorException("Missing IO information.")) #Julia check left side first, if it's false don't check rest

            port_id = get(input, "PortID", missing)
            port_type = get(input, "PortType", missing)
            if port_id === missing || port_type === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(inputs, PortInfo(port_id,port_type))
        end
        outputs = []
        for output in get(dict, "Outputs", missing)
            output === missing && throw(ErrorException("Missing IO information."))

            port_id = get(output, "PortID", missing)
            port_type = get(output, "PortType", missing)
            # channel = Channel{eval(Symbol(port_type))}(1)
            channelName = "" * functionid * "_" * string(id) * "_" * string(port_id)
            channel = Channel(1)
            if port_id === missing || port_type === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(outputs, PortInfo(port_id,port_type, channel, channelName))
        end
        IOinfo(inputs, outputs)
    end

    function getCoords(coords)

        coordX = get(coords, "CoordX", missing)
        coordY = get(coords, "CoordY", missing)
        if coordX === missing || coordY === missing
            throw(ErrorException("Missing argument: Coords"))
        end
        Coord(coordX, coordY)
    end
end
