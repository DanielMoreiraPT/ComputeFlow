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

###################

############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function Mean_f(inPort1, options)
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
function New Project_f()
	Plot_5_0 = Channel{Plot}(1)

	Histogram_6_0 = Channel{Plot}(1)

	Mean_7_0 = Channel{Float64}(1)

	Average_8_0 = Channel{Float64}(1)

	ParseToFloat_9_0 = Channel{Array{Float64,1}}(1)

	FileReader_10_0 = Channel{String}(1)

	 @async Task(WriteToFile_f(Average_8_0,"Computation/Aneta/Options_files/WriteToFile1_options.json"))

	 @async Task(WriteToFile_f(Mean_7_0,"Computation/Aneta/Options_files/WriteToFile2_options.json"))

	 @async Task(SavePNG_f(Histogram_6_0,"Computation/Aneta/Options_files/SavePNG3_options.json"))

	 @async Task(SavePNG_f(Plot_5_0,"Computation/Aneta/Options_files/SavePNG4_options.json"))

	 @async Task(Plot_f(ParseToFloat_9_0,Plot_5_0,"Computation/Aneta/Options_files/Plot5_options.json"))

	 @async Task(Histogram_f(ParseToFloat_9_0,Histogram_6_0,"Computation/Aneta/Options_files/Histogram6_options.json"))

	 @async Task(Mean_f(ParseToFloat_9_0,Mean_7_0,"Computation/Aneta/Options_files/Mean7_options.json"))

	 @async Task(Average_f(ParseToFloat_9_0,Average_8_0,"Computation/Aneta/Options_files/Average8_options.json"))

	 @async Task(ParseToFloat_f(FileReader_10_0,ParseToFloat_9_0,"Computation/Aneta/Options_files/ParseToFloat9_options.json"))

	 @async Task(FileReader_f(FileReader_10_0,"Computation/Aneta/Options_files/FileReader10_options.json"))


end
 New Project_f()
