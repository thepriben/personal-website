import base64, json, subprocess, sys

REPO = "Medialoco/medialoco.github.io"
BASE_COMMIT = "673db65a6bec54c8251a6fd1f999315079a3ef0f"
BASE_TREE = "332eaeb380ca788b01e64abe2e676d12ac9f8095"
MSG = "Add OpenStreetMap continental data preprint to GIS section"
AUTHOR = {"name": "thepriben", "email": "thepriben@proton.me"}


def gh_api(method, path, payload):
    p = subprocess.run(
        ["gh", "api", "-X", method, f"repos/{REPO}/{path}", "--input", "-"],
        input=json.dumps(payload).encode(),
        capture_output=True,
    )
    if p.returncode != 0:
        sys.stderr.write(p.stderr.decode())
        sys.exit(1)
    return json.loads(p.stdout.decode())


with open("tech_articles.html", "rb") as f:
    content_b64 = base64.b64encode(f.read()).decode()

blob = gh_api("POST", "git/blobs", {"content": content_b64, "encoding": "base64"})
print("blob:", blob["sha"])

tree = gh_api("POST", "git/trees", {
    "base_tree": BASE_TREE,
    "tree": [{"path": "tech_articles.html", "mode": "100644", "type": "blob", "sha": blob["sha"]}],
})
print("tree:", tree["sha"])

commit = gh_api("POST", "git/commits", {
    "message": MSG,
    "tree": tree["sha"],
    "parents": [BASE_COMMIT],
    "author": AUTHOR,
    "committer": AUTHOR,
})
print("commit:", commit["sha"])

ref = gh_api("PATCH", "git/refs/heads/main", {"sha": commit["sha"], "force": False})
print("ref now:", ref["object"]["sha"])
