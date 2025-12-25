#!/usr/bin/env perl
use strict;
use warnings;
use utf8;

#  ____ _                           _
# / ___| |__   __ _ _ __   ___  ___| |__
#| |   | '_ \ / _` | '_ \ / _ \/ __| '_ \
#| |___| | | | (_| | |_) |  __/\__ \ | | |
# \____|_| |_|\__,_| .__/ \___||___/_| |_|
#                   |_|
# change_places.pl — because it's tea time & we're flipping the script.

use Text::Markdown 'markdown';

#   cat file.md | md2html.pl  > file.html

my $markdown;
{
    local $/ = undef;  # enable slurp mode
    if (@ARGV) {
        my $file = shift @ARGV;
        open my $fh, '<', $file or die "Cannot open '$file': $!";
        binmode($fh, ':encoding(UTF-8)');
        $markdown = <$fh>;
        close $fh;
    } else {
        binmode(STDIN, ':encoding(UTF-8)');
        $markdown = <STDIN>;
    }
}

my $title = 'Document';
if ($markdown =~ /^\s*#+\s*(.+?)\s*$/m) {
    $title = $1;
}
$title =~ s/</&lt;/g;
$title =~ s/>/&gt;/g;

my $body_html = markdown($markdown);

print <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>$title</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            max-width: 60rem;
            margin: 2rem auto;
            padding: 0 1rem;
            font-family: system-ui, -apple-system, BlinkMacSystemFont,
                         "Segoe UI", sans-serif;
            line-height: 1.6;
        }
        pre, code {
            font-family: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
        }
        pre {
            padding: 0.75rem 1rem;
            border-radius: 4px;
            background: #f5f5f5;
            overflow-x: auto;
        }
        h1, h2, h3, h4 {
            margin-top: 1.6em;
        }
        a {
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
$body_html
</body>
</html>
HTML

exit 0;