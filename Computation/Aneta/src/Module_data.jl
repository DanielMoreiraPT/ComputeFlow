"""
# module Module_data

- Julia version:
- Author: anunia
- Date: 2020-04-21

# Examples

```jldoctest
julia>
```
"""
module Module_data
    export creat_module, Module_info
    using JSON

    struct Coord
        coordX
        coordY
        Coord(x,y) = new(x,y)
    end

    struct Port_info
        port_id
        port_type::String
        channel
        Port_info(id, type) = new(id, type)
        Port_info(id, type, channel) = new(id, type, channel)
    end

    struct IOinfo
        inputs::Array{Port_info, 1}
        outputs::Array{Port_info, 1}
        IOinfo(input_array, output_array) = new(input_array, output_array)
    end

    struct Conect_module_info
        module_id
        module_port
        input_port
        Conect_module_info(module_id, module_port, input_port) = new(module_id, module_port, input_port)
    end

    struct Connections
        inputs::Array{Conect_module_info,1}
        outputs::Array{Conect_module_info,1}
        Connections(inputs, outputs) = new(inputs, outputs)
    end

    struct Module_info
        id
        coords::Coord
        functionid
        io::IOinfo
        connections
        Module_info(id, coords, functionid, io, connections) = new(id, coords, functionid, io, connections)
    end



    function creat_module(data)
        id = get(data,"Id",missing)
        coords = get_coords(get(data, "Coord",missing))
        functionid = get(data, "FunctionID", missing)
        io = get_IOinfo(get(data,"IO", missing))
        connections = get_connections(get(data, "Connections",missing))

        module_info = Module_info(id, coords, functionid, io, connections)
        # println("=====>", module_info)
        # println("=====>", module_info.id)
        # println("=====>", module_info.coords)
        # println("=====>", module_info.functionid)
        # println("=====>", module_info.io)
        # println("=====>", module_info.connections)
        return module_info
    end

    function get_connections(dict)
        inputs = []
        for input in get(dict, "Inputs",missing)
            (input === missing) && throw(ErrorException("Missing IO information.")) #Julia check left side first, if it's false don't check rest

            moduleid = get(input, "ModuleID",missing)
            moduleport = get(input, "ModulePort", missing)
            inputport = get(input, "InputPort", missing)
            if moduleid === missing || moduleport === missing || inputport === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(inputs, Conect_module_info(moduleid,moduleport,inputport))
        end
        outputs = []
        for output in get(dict, "Outputs",missing)
            output === missing && throw(ErrorException("Missing IO information.")) #Julia check left side first, if it's false don't check rest

            moduleid = get(output, "ModuleID",missing)
            moduleport = get(output, "ModulePort", missing)
            outputport = get(output, "OutputPort", missing)
            if moduleid === missing || moduleport === missing || outputport === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(outputs, Conect_module_info(moduleid,moduleport,outputport))
        end
        Connections(inputs, outputs)
    end

    function get_IOinfo(dict)
        inputs = []
        for input in get(dict,"Inputs",missing)
            input === missing && throw(ErrorException("Missing IO information.")) #Julia check left side first, if it's false don't check rest

            port_id = get(input, "PortID", missing)
            port_type = get(input, "PortType", missing)
            if port_id === missing || port_type === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(inputs, Port_info(port_id,port_type))
        end
        outputs = []
        for output in get(dict,"Outputs",missing)
            output === missing && throw(ErrorException("Missing IO information."))

            port_id = get(output, "PortID", missing)
            port_type = get(output, "PortType", missing)
            channel = Channel(1)
            if port_id === missing || port_type === missing
                throw(ErrorException("Missing IO information."))
            end
            push!(outputs, Port_info(port_id,port_type, channel))
        end
        IOinfo(inputs, outputs)
    end
    function get_coords(coords)
        #=coords = Coord(get(dict,"CoordX",missing),get(dict,"CoordY",missing))
        if coords === missing
            throw(ErrorException("Missing argument: Coords"))
        end=#
        coordX = get(coords, "CoordX", missing)
        coordY = get(coords, "CoordY", missing)
        if coordX === missing || coordY === missing
            throw(ErrorException("Missing argument: Coords"))
        end
        Coord(coordX, coordY)
    end
    #=open("test.json","r") do jfile
        dataDict = JSON.parse(read(jfile,String))
        for mod in get(dataDict,"Modules",missing)
            creat_module(mod)
        end
    end=#
end
