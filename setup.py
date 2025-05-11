import os

from setuptools import setup
from os import path

install_requires = [
    "wagtail>=6.2",
    "djangorestframework>=3.12.0",
]

here = path.abspath(path.dirname(__file__))

with open(path.join(here, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

setup(
        name="wagtailterms",
        version=os.environ.get("RELEASE_VERSION", '0.0.1'),
        description="A Wagtail plugin to add support for glossary terms entity to Draftail",
        long_description=long_description,
        long_description_content_type="text/markdown",
        url="https://github.com/smark-1/wagtailterms/",
        download_url="https://pypi.python.org/pypi/wagtailterms",
        license="MIT",
        packages=["wagtailterms"],
        install_requires=install_requires,
        include_package_data=True,
        keywords=[
            "wagtail",
            "draftjs",
            "Draftail",
            "picker",
            "term",
            "definition",
            "glossary",
        ],
        classifiers=[
            "Intended Audience :: Developers",
            "License :: OSI Approved :: MIT License",
            "Operating System :: OS Independent",
            "Programming Language :: Python :: 3",
            "Programming Language :: Python :: 3.9",
            "Programming Language :: Python :: 3.10",
            "Programming Language :: Python :: 3.11",
            "Programming Language :: Python :: 3.12",
            "Programming Language :: Python :: 3.13",
            "Framework :: Django",
            "Framework :: Django :: 4.2",
            "Framework :: Django :: 5.0",
            "Framework :: Django :: 5.1",
            "Framework :: Django :: 5.2",
            "Framework :: Wagtail",
            "Framework :: Wagtail :: 6.2",
            "Framework :: Wagtail :: 6.3",
            "Framework :: Wagtail :: 6.4",
            "Framework :: Wagtail :: 7.0",
        ],
)
