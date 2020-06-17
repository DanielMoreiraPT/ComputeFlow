"""
# module FileReaderByLine

- Julia version:
- Author: anunia
- Date: 2020-04-25

"""

import JSON


################################################
struct Options_FileReaderByLine
    file_name::String
    Options_FileReader(file_name) = new(file_name)
end

function set_options_FileReaderByLine(options)
    options = JSON.parse(read(options,String))

    file_name = get(options,"file_name",missing)
    Options_FileReader("Computation/Aneta/"*file_name)
end

############################################
#   Main function of the module
function FileReaderByLine_f(outPort1, options)

    options = set_options_FileReader(options)

    open("/usr/share/dict/words") do io
           put!(outPort1,readline(io))
    end


end
