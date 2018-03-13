#!/usr/bin/env python
import subprocess
import shutil
import os
import os.path
import re
import functools
from binascii import hexlify
import json
from hashlib import sha256

import pytz
import dateutil.parser
from jinja2 import (
    Environment, FileSystemLoader, select_autoescape, evalcontextfilter, Markup
)
import markdown2
import w3lib.html


if os.path.exists('intermediate'):
    shutil.rmtree('intermediate')
os.mkdir('intermediate')

# Copy handmade static files
base = 'source'
for root, dirs, files in os.walk(base):
    root = root[len(base) + 1:]
    for f in files:
        path = os.path.join(root, f)
        os.makedirs(os.path.join('intermediate', root), exist_ok=True)
        if 'help/' in path and f.endswith('.png'):
            subprocess.check_call([
                'convert',
                os.path.join(base, path),
                os.path.join('intermediate', path.replace('.png', '.jpg')),
            ])
        elif f.endswith('.jpg'):
            continue
        else:
            shutil.copy(
                os.path.join(base, path),
                os.path.join('intermediate', path))

bust = hexlify(os.urandom(4)).decode('utf-8')
jinja = Environment(
    loader=FileSystemLoader('templates'),
    autoescape=select_autoescape(['html', 'xml'])
)


@functools.lru_cache()
def get_template(template):
    return jinja.get_template(template)


def render(template, **kwargs):
    return get_template(template).render(
        template=template,
        bust=bust,
        **kwargs
    )


@evalcontextfilter
def render_filter(context, value):
    if not value:
        return value
    out = markdown2.markdown(value, extras=['tables'])
    if context.autoescape:
        return Markup(out)
    else:
        return out


jinja.filters['render'] = render_filter

# Create help pages
os.makedirs('intermediate/help', exist_ok=True)
page_file = open('intermediate/help.html', 'w')
page_file.write(render('help.html'))

for article in os.listdir('help'):
    if not article.endswith('.md'):
        continue

    slug = re.search('(.*)\.md', article).groups()
    with open('help/' + article, 'r') as source:
        header = source.readline()
        body = markdown2.markdown(source.read(), extras=['tables'])

    title, = re.search('<!-- (.*) -->', header).groups()
    article_path = '{}.html'.format(article[:-3])
    with open('intermediate/help/' + article_path, 'w') as out:
        out.write(render(
            'help_article.html',
            title=title,
            body=body,
        ))

# Create blog pages, gather news headlines
os.makedirs('intermediate/updates', exist_ok=True)
recent = []
page = 1
page_file = None
page_articles = []


def finish_page():
    if not page_articles:
        return
    os.makedirs('intermediate/updates', exist_ok=True)
    if page == 1:
        page_file = open('intermediate/updates.html', 'w')
    else:
        page_file = open(
            'intermediate/updates_page{:03}.html'.format(page), 'w')
    with page_file:
        page_file.write(render(
            'update.html',
            page=page,
            updates=page_articles,
        ))
        del page_articles[:]


for index, update in enumerate(reversed(sorted(os.listdir('updates')))):
    if not update.endswith('.md'):
        continue

    y, m, d, p, slug = re.search(
        '(\\d+)_(\\d+)_(\\d+)_(\\d+)_(.*)\.md', update).groups()
    with open('updates/' + update, 'r') as source:
        header = source.readline()
        sdate, title = re.search('<!-- ([^ ]+) (.*) -->', header).groups()
        date = dateutil.parser.parse(sdate)
        body = markdown2.markdown(source.read(), extras=['tables'])

    article_path = 'updates/update_{}.html'.format(update[:-3])

    if len(recent) < 4:
        textbody = w3lib.html.remove_tags(body)
        truncbody = textbody[:max(0, 130 - len(title))]
        if truncbody != textbody:
            truncbody += '...'
        recent.append(dict(
            date=date,
            title=title,
            body=truncbody,
            path=article_path,
        ))

    article = dict(
        date=date,
        title=title,
        body=body,
        path=article_path,
    )
    with open('intermediate/' + article_path, 'w') as out:
        out.write(render(
            'update_article.html',
            update=article,
        ))

    page_articles.append(article)
    if index + 1 % 15 == 0:
        finish_page()
        page += 1

finish_page()

# Create home page
with open('intermediate/index.html', 'w') as out:
    out.write(render(
        'index.html',
        recent=recent,
    ))

# Create app page
with open('intermediate/app/index.html', 'w') as out:
    out.write(render(
        'app_index.html',
    ))

# Create api doc page
with open('api.json', 'r') as api_json:
    with open('intermediate/api.html', 'w') as out:
        out.write(render(
            'api.html',
            endpoints=sorted(json.load(api_json), key=lambda e: e['path']),
        ))

# Create tos page
tosdate = subprocess.check_output([
    'git', 'log', '-1', '--format=%cd', 'tos.md']).decode('utf-8')
print('tosdate', tosdate)
tosdate = dateutil.parser.parse(tosdate).astimezone(pytz.utc)
with open('tos.md', 'rb') as source:
    tosdata = source.read()
tostext = '<p>Last updated {}.</p>\n{}'.format(
    tosdate.strftime('%Y-%m-%d %H:%M %P UTC'),
    markdown2.markdown(tosdata.decode('utf-8'), extras=['tables']),
)
with open('intermediate/app/tos.html', 'w') as out:
    out.write(tostext)
with open('intermediate/tos.html', 'w') as out:
    out.write(render('tos.html', tostext=tostext))
with open('intermediate/app/_tos.js', 'w') as out:
    out.write('export const currentTos = \'{}\'\n'.format(
        sha256(tosdata).hexdigest()))

# Package js and perform automatic additions
subprocess.check_call(['npm', 'run-script', 'build'])