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
function NewProject_f()
	Average_2_0 = Channel{Float64}(1)

	ParseToFloat_3_0 = Channel{Array{Float64,1}}(1)

	FileReader_4_0 = Channel{String}(1)

	Plot_5_0 = Channel{Plot}(1)

	 @async Task(WriteToFile_f(Average_2_0,"missing"))

	 @async Task(Average_f(ParseToFloat_3_0,Average_2_0,"missing"))

	 @async Task(ParseToFloat_f(FileReader_4_0,ParseToFloat_3_0,"missing"))

	 @async Task(FileReader_f(FileReader_4_0,"missing"))

	 @async Task(Plot_f(ParseToFloat_3_0,Plot_5_0,"missing"))

	 @async Task(SavePNG_f(Plot_5_0,"missing"))


end
 NewProject_f()
