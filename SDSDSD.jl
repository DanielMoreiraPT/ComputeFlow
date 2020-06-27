
###################

###################

############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
    import Statistics
function Mean_f(inPort1, outPort1, options)


    # numberOfInputs = 0

    numbers = take!(inPort1)

    # while input != "end"
    #     add(numbers, input)
    #     numberOfInputs += 1
    #     input = take!(inPort1)
    # end

    mean = Statistict.mean(numbers)

    put!(outPort1, mean)
end

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

###################
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

############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function Mean_f(inPort1, options)


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
function SDSDSD_f()
	Histogram_1_0 = Channel{}(1)

	Mean_3_0 = Channel{Float64}(1)

	Average_4_0 = Channel{Float64}(1)

	ParseToFloat_5_0 = Channel{Array{Float64,1}}(1)

	FileReader_6_0 = Channel{String}(1)

	Plot_9_0 = Channel{}(1)

	 @async Task(Histogram_f(None,Histogram_1_0,"Computation/Aneta/Options_files/Histogram1_options.json"))

	 @async Task(SavePNG_f(Histogram_1_0,"Computation/Aneta/Options_files/SavePNG2_options.json"))

	 @async Task(Mean_f(None,Mean_3_0,"Computation/Aneta/Options_files/Mean3_options.json"))

	 @async Task(Average_f(None,Average_4_0,"Computation/Aneta/Options_files/Average4_options.json"))

	 @async Task(ParseToFloat_f(None,ParseToFloat_5_0,"Computation/Aneta/Options_files/ParseToFloat5_options.json"))

	 @async Task(FileReader_f(FileReader_6_0,"Computation/Aneta/Options_files/FileReader6_options.json"))

	 @async Task(WriteToFile_f(FileReader_6_0,"Computation/Aneta/Options_files/WriteToFile7_options.json"))

	 @async Task(WriteToFile_f(ParseToFloat_5_0,"Computation/Aneta/Options_files/WriteToFile8_options.json"))

	 @async Task(Plot_f(Plot_9_0,"Computation/Aneta/Options_files/Plot9_options.json"))


end
 SDSDSD_f()
