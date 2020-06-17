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

###################

###################

############################################
#   Function counting Average of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function Average_f(inPort1, outPort1, options)

    sum = 0
    numberOfInputs = 0

    input = take!(inPort1)

    while input != "end"
        sum += input;
        numberOfInputs += 1
        input = take!(inPort1)
    end


    avr = sum / numberOfInputs

    put!(outPort1, avr)
end

###################

############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function Mean_f(inPort1, outPort1, options)
    import Statistics

    numbers = []
    numberOfInputs = 0

    input = take!(inPort1)

    while input != "end"
        add(numbers, input)
        numberOfInputs += 1
        input = take!(inPort1)
    end

    mean = Statistict.mean(numbers)

    put!(outPort1, mean)
end

###################

###################

############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function Mean_f(inPort1, outPort1, options)
    import Statistics

    numbers = []
    numberOfInputs = 0

    input = take!(inPort1)

    while input != "end"
        add(numbers, input)
        numberOfInputs += 1
        input = take!(inPort1)
    end

    mean = Statistict.mean(numbers)

    put!(outPort1, mean)
end

###################

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
function Temperature_Calculations_f()
FileReader_1_1_String = Channel(1)

ParseToFloat_2_1_Array{Float64,1} = Channel(1)

Average_3_1_Float64 = Channel(1)

Mean_4_1_Float64 = Channel(1)

Histogram_5_1_ = Channel(1)

Plot_6_1_ = Channel(1)

	 @async Task(FileReader_f(FileReader_1_1_String,"Computation/Aneta/Options_files/FileReader1_options.json"))

	 @async Task(ParseToFloat_f(FileReader_1_1_String,ParseToFloat_2_1_Array{Float64,1},"Computation/Aneta/Options_files/ParseToFloat2_options.json"))

	 @async Task(Average_f(ParseToFloat_2_1_Array{Float64,1},Average_3_1_Float64,"Computation/Aneta/Options_files/Average3_options.json"))

	 @async Task(Mean_f(ParseToFloat_2_1_Array{Float64,1},Mean_4_1_Float64,"Computation/Aneta/Options_files/Mean4_options.json"))

	 @async Task(Histogram_f(ParseToFloat_2_1_Array{Float64,1},Histogram_5_1_,"Computation/Aneta/Options_files/Histogram5_options.json"))

	 @async Task(Plot_f(ParseToFloat_2_1_Array{Float64,1},Plot_6_1_,"Computation/Aneta/Options_files/Plot6_options.json"))

	 @async Task(SavePNG_f(Histogram_5_1_,"Computation/Aneta/Options_files/SavePNG7_options.json"))

	 @async Task(SavePNG_f(Plot_6_1_,"Computation/Aneta/Options_files/SavePNG8_options.json"))

	 @async Task(WriteToFile_f(Average_3_1_Float64,"Computation/Aneta/Options_files/WriteToFile9_options.json"))

	 @async Task(WriteToFile_f(Mean_4_1_Float64,"Computation/Aneta/Options_files/WriteToFile10_options.json"))


end
 Temperature_Calculations_f()
