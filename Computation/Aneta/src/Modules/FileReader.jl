"""
# module FileReader

- Julia version:
- Author: anunia
- Date: 2020-04-25

# Examples

```jldoctest
julia>
```
"""

module FileReader()
    import JSON


    ################################################
#   UNMUTABLE part of module schema.
    struct Function_info
        name::String
        version::String
        id::UInt64
        Function_info(name, verion, id) =
            new(name, verion, id)
    end

    struct Options_FileReader
        file_name::String
        Options(file_name) = new(file_name)
    end

    function set_options_FileReader(options)
        options = JSON.parse(read(options,String))

        file_name = get(options,"file_name",missing)
        Options("Computation/Aneta/"*file_name)
    end

    func_info = Function_info("FileReader", "v.1.0.0",hash("FileReader"*"v.1.0.0"))

    #FileReader_chanel = Channel(1)
############################################
#   MUTABLE part of module schema.
    function FileReader_f(inputs_p, outputs_p, options)

        options = set_options_FileReader(options)
        text = read(options.file_name, String)

        put!(outputs_p[1],text)
    end
end
