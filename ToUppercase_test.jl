"""
# module ToUpercase

- Julia version:
- Author: anunia
- Date: 2020-04-26

# Examples

```jldoctest
julia>
```
"""

module ToUppercase
    using JSON

    struct Options_ToUppercase
        all_text::Bool
        just_first_letters::Bool
        from_the_begging::Bool
        fb_amount_of_char::Int64
        from_the_end::Bool
        fe_amount_of_char::Int64
        Options_ToUppercase(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char) =
            new(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end


    function set_options_ToUppercase(options)
        options = JSON.parse(read(options,String))

        all_text = get(options,"all_text",missing)
        just_first_letters = get(options,"just_first_letters",missing)
        from_the_begging = get(options,"from_the_begging",missing)
        fb_amount_of_char = get(options,"fb_amount_of_char",missing)
        from_the_end = get(options,"from_the_end",missing)
        fe_amount_of_char = get(options,"fe_amount_of_char",missing)

        Options_ToUppercase(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end
    function all_text_ToUppercase(text)
        uppercase(text)
    end
    function just_first_letters_ToUppercase(text)
        result = ""
        words = split(text, " ")
        for word in words
            if word != "" && word[1]>='a' && word[1]<='z'
                word[1] += "A" - "a"
                result *= word
            end
        end
        return result
    end
    function from_the_begging_ToUppercase(text, amount)
        result = ""
        if length(text) <= amount
            result = all_text(text)
        else
            i=1
            for c in text
                d=(uppercase("$c"))
                if amount > i
                    result = result * d
                else
                    result = result * "$c"
                end
                i = i + 1
            end
        end

        return result
    end
    function from_the_end_ToUppercase(text, amount)
        textlength = length(text)
        result = ""
        if textlength <= amount
            result = all_text(text)
        else
            i=1
            for c in text
                d=(uppercase("$c"))
                if textlength - amount < i
                    result = result * d
                else
                    result = result * "$c"
                end
                i = i + 1
            end
        end
        return result
    end
    function get_text(channel)
        txt = take!(channel)
        return txt
    end
################# PROGRAM #################
    function ToUppercase_f(inputs_p, outputs_p, options)
        println(options)
        options = set_options_ToUppercase(options)

        text = get_text(inputs_p[1])

        if options.all_text
            text = all_text_ToUppercase(text)
        else
            if options.just_first_letters
                text = just_first_letters_ToUppercase(text)
            end
            if options.from_the_begging
                text = from_the_begging_ToUppercase(text,options.fb_amount_of_char)
            end
            if options.from_the_end
                text = from_the_end_ToUppercase(text, options.fe_amount_of_char)
            end
        end
        put!(outputs_p[1], text)
    end
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

module FileReader()
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
    function FileReader_f(inputs_p, outputs_p, options)

        options = set_options_FileReader(options)

        text = read(options.file_name, String)

        put!(outputs_p[1],text)
    end
end

###################
module WriteToFile
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
    function WriteToFile_f(inputs_p, outputs_p, options)
        options = set_options_WriteToFile(options)
        text = take!(inputs_p[1])
        println(text)

        open(options.file_name, "w") do f
            write(f, string(text))
        end
    end
end

###################
function ToUppercase_test_f()
ToUppercase_1_1_String = Channel(1)

FileReader_2_1_String = Channel(1)

	ToUppercase_f(FileReader_2_1_String,ToUppercase_1_1_String,"Computation/Aneta/Options_files/ToUppercase1_options.json")

	FileReader_f(FileReader_2_1_String,"Computation/Aneta/Options_files/FileReader2_options.json")

	WriteToFile_f(ToUppercase_1_1_String,"Computation/Aneta/Options_files/WriteToFile3_options.json")


end
