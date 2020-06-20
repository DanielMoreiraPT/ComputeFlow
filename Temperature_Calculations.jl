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
############################################
#   Function counting mean of the numbers received by input Channel
#
function ParseToFloat_f(inPort1, outPort1, options)
    text = fetch(inPort1)

    splitedText = split(text, r"\n| ",keepempty=false)
    numbers = []

    for txt in splitedText
        number = parse(Float64, txt)
        push!(numbers, number)

    end

    put!(outPort1, numbers)


end

###################

############################################
#   Function counting Average of the numbers received by input Channel
#
function Average_f(inPort1, outPort1, options)

    sum = 0
    numbers = fetch(inPort1)

    for number in numbers
        sum += number
    end

    avr = sum / length(numbers)

    put!(outPort1, avr)
end

###################

############################################
#   Function counting mean of the numbers received by input Channel
#
import Statistics

function Mean_f(inPort1, outPort1, options)

    numbers = fetch(inPort1)

    middle = Statistics.middle(numbers)
    put!(outPort1, middle)
end

###################
############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
using Plots
using Distributions

function Histogram_f(inPort1, outPort1, options)
    y = fetch(inPort1)

    plt = histogram(y,fmt = :png)
    # savefig(plt,"histogram.png")

    put!(outPort1, plt)
end

###################

############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
using Plots

function Plot_f(inPort1, outPort1, options)
    y = fetch(inPort1)

    plt = plot(y,fmt = :png)
    # savefig(plt,"plot.png")

    put!(outPort1, plt)
end

###################
############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
struct Options_SavePNG
    file_name::String
    Options_SavePNG(file_name) = new(file_name)
end
##########
function set_options_SavePNG(options)
    options = JSON.parse(read(options,String))
    file_name = get(options,"file_name",missing)
    Options_SavePNG(file_name)
end

function SavePNG_f(inPort1, options)
    options = set_options_SavePNG(options)

    plot = fetch(inPort1)

    savefig(plot, options.file_name)
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

    open(options.file_name, "w") do f
        write(f, string(text))
    end
end

###################
function Temperature_Calculations_f()
	FileReader_1_1 = Channel{String}(1)

	ParseToFloat_2_1 = Channel{Array{Float64,1}}(1)

	Average_3_1 = Channel{Float64}(1)

	Mean_4_1 = Channel{Float64}(1)

	Histogram_5_1 = Channel{}(1)

	Plot_6_1 = Channel{}(1)

	 @async Task(FileReader_f(FileReader_1_1,"Computation/Aneta/Options_files/FileReader1_options.json"))

	 @async Task(ParseToFloat_f(FileReader_1_1,ParseToFloat_2_1,"Computation/Aneta/Options_files/ParseToFloat2_options.json"))

	 @async Task(Average_f(ParseToFloat_2_1,Average_3_1,"Computation/Aneta/Options_files/Average3_options.json"))

	 @async Task(Mean_f(ParseToFloat_2_1,Mean_4_1,"Computation/Aneta/Options_files/Mean4_options.json"))

	 @async Task(Histogram_f(ParseToFloat_2_1,Histogram_5_1,"Computation/Aneta/Options_files/Histogram5_options.json"))

	 @async Task(Plot_f(ParseToFloat_2_1,Plot_6_1,"Computation/Aneta/Options_files/Plot6_options.json"))

	 @async Task(SavePNG_f(Histogram_5_1,"Computation/Aneta/Options_files/SavePNG7_options.json"))

	 @async Task(SavePNG_f(Plot_6_1,"Computation/Aneta/Options_files/SavePNG8_options.json"))

	 @async Task(WriteToFile_f(Average_3_1,"Computation/Aneta/Options_files/WriteToFile9_options.json"))

	 @async Task(WriteToFile_f(Mean_4_1,"Computation/Aneta/Options_files/WriteToFile10_options.json"))


end
 Temperature_Calculations_f()
