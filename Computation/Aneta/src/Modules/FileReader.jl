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

import JSON


################################################
struct Options_FileReader
    file_name::String
    Options_FileReader(file_name) = new(file_name)
end

function set_options_FileReader(options)
    options = JSON.parse(read(options,String))

    file_name = get(options,"file_name",missing)
    Options_FileReader("Computation/Aneta/"*file_name)
end

############################################
#   Main function of the module
function FileReader_f(outPort1, options)

    options = set_options_FileReader(options)

    text = read(options.file_name, String)

    put!(outPort1,text)
end
