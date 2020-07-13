############################################
#   Main function of the module
function FileReader_f(outPort1, variables)

    fileName = get(variables,"file_name",missing)

    text = read(fileName, String)

    put!(outPort1,text)
end
