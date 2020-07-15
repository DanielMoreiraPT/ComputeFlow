############################################
#   Main function of the module
function FileReaderByLine_f(outPort1, variables)

    fileName = get(variables,"file_name",missing)

    open(fileName) do io
           put!(outPort1,readline(io))
    end


end
