"""Summarize real failure causes and plan only unambiguous native model bindings."""
from pathlib import Path,PurePosixPath
import collections,json
ROOT=Path(__file__).resolve().parents[1];PRIVATE=ROOT/'pipeline/private'
def normalized(path):
 path=path.replace('\\','/');p=PurePosixPath(path)
 if p.is_absolute() or '..' in p.parts or ':' in path or not path:raise ValueError('Unsafe original reference')
 return str(p).lower()
def bindings_index(rows):
 out=collections.defaultdict(list)
 for row in rows:
  try:
   model=normalized(str(PurePosixPath(row['model'].replace('\\','/')).with_suffix('.smd')));config=normalized(row['config']);normalized(row['bones'])
  except (ValueError,KeyError):continue
  if config not in out[model]:out[model].append(config)
 return out
def plan(results,bindings):
 index=bindings_index(bindings);items=[]
 for row in results:
  if row['status']=='validated_candidate':continue
  error=row.get('error','');source=row['source'];candidates=index.get(normalized(source),[])
  if 'Stale file handle' in error:kind='transient_cache_retry'
  elif error.startswith('FileNotFoundError: Client dependency absent:') and error.lower().endswith('.inx'):
   kind='unambiguous_native_binding' if len(candidates)==1 else 'ambiguous_native_binding' if candidates else 'native_binding_not_found'
  elif 'Invalid original OBJ magic' in error:kind='object_format_variant'
  elif 'Unknown trailing model bytes' in error:kind='trailing_data_variant'
  elif 'Unsupported file format' in error:kind='unsupported_format'
  elif 'Unsafe asset reference' in error:kind='invalid_or_empty_native_reference'
  else:kind='inspect_converter_error'
  items.append({'source':source,'category':kind,'nativeConfigurations':candidates,'error':error})
 return items
if __name__=='__main__':
 batch=json.loads((PRIVATE/'batch-results.json').read_text());path=PRIVATE/'bindings.json';bindings=json.loads(path.read_text()) if path.exists() else []
 items=plan(batch['results'],bindings);(PRIVATE/'repair-plan.json').write_text(json.dumps(items,indent=2));summary={'processed':len(batch['results']),'total':batch['total'],'nativeBindingsIndexed':len(bindings),'categories':dict(collections.Counter(x['category'] for x in items)),'batchComplete':batch['complete']};(ROOT/'pipeline/repair-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary))
