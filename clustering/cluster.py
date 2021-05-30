import json
import sys
import numpy as np
from sklearn.metrics import silhouette_score
from sklearn.cluster import KMeans
from scipy.spatial import distance
from scipy.cluster.vq import vq

kmin = 2
kmax = 8

def perform_clustering(data):
    data = json.loads(data)
    sil=[]
    clusters = []

    for k in range(kmin, kmax+1):
        kmeans = KMeans(n_clusters=k, random_state=0).fit(data)
        labels = kmeans.labels_
        score = silhouette_score(data, labels, metric = 'euclidean')
        clusters.append(kmeans.cluster_centers_)
        sil.append(score)
        print(f"Clustering k={k}, score={score}")

    i = int(np.argmax(sil))
    k = i + kmin
    print(f"Best k={k}")
    clusterList = [{'idx': i, 'centroid': centroid.tolist()} for i, centroid in enumerate(clusters[i])]
    return {'k': k, 'centroids': clusterList}

def cluster_database(data, clusters, threshold):
    data = json.loads(data)
    clusters = json.loads(clusters)
    centroids = [cluster['centroid'] for cluster in clusters]
    print(f"Clustering database")

    closest, distances = vq(data, centroids)
    for i in range(len(centroids)):
        n = len(closest[closest == i])
        print(f"Cluster {i} contains {n} songs")
    print(f"There are {len(closest[closest == -1])} outliers")

    predClusters = np.array([pred if distances[i] < float(threshold) else -1 for i, pred in enumerate(closest)]).tolist()

    return predClusters


function_type = sys.argv[1]
data = input()
ret = None
if function_type == 'cluster':
    ret = perform_clustering(data)
elif function_type == 'predict':
    ret = cluster_database(data, sys.argv[2], sys.argv[3])
print("Result: " + json.dumps(ret))
