using JSON

struct Options_Addition
    Options_Addition() = new()
end
##########
function set_options_Addition()
    name = "Computation/Aneta/Addition_options.json"

    options = JSON.parse(read(name,String))

    Options_Addition()
end


############################################
#   MUTABLE part of module schema.
function Addition_f(inPort1, inPort2, outPort1, options)

    # options = set_options_Addition()
    number1 = take!(inPort1)

    number2 = take!(inPort2)

    sum = parse(Int64 ,number1) + parse(Int64 ,number2)

    put!(outPort1, sum)
end

###################
using JSON

struct Options_GetNumber
    number
    Options_GetNumber(number) = new(number)
end
##########
function set_options_GetNumber(options)

    options = JSON.parse(read(options,String))
    number = get(options,"number",missing)

    Options_GetNumber(number)
end

############################################
#   MUTABLE part of module schema.
function GetNumber_f(outPort1, options)

    options = set_options_GetNumber(options)

    put!(outPort1, string(options.number))

end

###################
using JSON

struct Options_WriteToFile
    file_name::String
    Options_WriteToFile(file_name) = new(file_name)
end
##########
function set_options_WriteToFile(options)
    options = JSON.parse(read(options,String))
    file_name = get(options,"file_name",missing)
    Options_WriteToFile(file_name)
end


############################################
#   MUTABLE part of module schema.
function WriteToFile_f(inPort1, options)
    options = set_options_WriteToFile(options)
    text = take!(inPort1)
    println(text)

    open(options.file_name, "w") do f
        write(f, string(text))
    end
end

###################
function Math_f()
Addition_1_1_Int64 = Channel(1)

GetNumber_2_1_Int64 = Channel(1)

GetNumber_3_1_Int64 = Channel(1)

	 @async Task(Addition_f(GetNumber_2_1_Int64,GetNumber_3_1_Int64,Addition_1_1_Int64,"Computation/Aneta/Options_files/Addition1_options.json"))

	 @async Task(GetNumber_f(GetNumber_2_1_Int64,"Computation/Aneta/Options_files/GetNumber2_options.json"))

	 @async Task(GetNumber_f(GetNumber_3_1_Int64,"Computation/Aneta/Options_files/GetNumber3_options.json"))

	 @async Task(WriteToFile_f(Addition_1_1_Int64,"Computation/Aneta/Options_files/WriteToFile4_options.json"))


end
 Math_f()
