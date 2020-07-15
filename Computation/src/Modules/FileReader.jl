################################################################################
#   Functionality: outputs file data as text.
function FileReader_f(outPort1, variables)

    fileName = get(variables,"file_name", missing)

    text = read(fileName, String)

    put!(outPort1,text)
end
