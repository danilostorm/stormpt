import struct,unittest
from legacy_normal_compat import normalized_headers
import model_glb
class LegacyNormalTests(unittest.TestCase):
 def fixture(self,magic):
  offset=596;data=bytearray(offset+2236);data[:24]=b'SMD Model data Ver 0.62\0';struct.pack_into('<5i',data,24,1,0,offset,offset,0);struct.pack_into('<2i',data,588,2236,offset);struct.pack_into('<I',data,offset,magic);return bytes(data)
 def test_native_normal_flag_only_changes_in_memory_header(self):
  original=self.fixture(0x41424344);converted=normalized_headers(original)
  with self.assertRaisesRegex(ValueError,'OBJ magic'):model_glb.inspect_model(original)
  info=model_glb.inspect_model(converted);self.assertEqual(len(info['objects']),1)
  self.assertEqual(struct.unpack_from('<I',original,596)[0],0x41424344)
  self.assertEqual([i for i,(a,b) in enumerate(zip(original,converted)) if a!=b],[599])
 def test_unknown_magic_and_unsupported_versions_remain_rejected(self):
  source=self.fixture(0xdeadbeef);self.assertEqual(normalized_headers(source),source)
  with self.assertRaisesRegex(ValueError,'OBJ magic'):model_glb.inspect_model(normalized_headers(source))
  self.assertEqual(normalized_headers(b'SMD Model data Ver 2.18\0'),b'SMD Model data Ver 2.18\0')
 def test_bad_offsets_are_not_rewritten(self):
  source=bytearray(self.fixture(0x41424344));struct.pack_into('<i',source,592,len(source)+100);self.assertEqual(normalized_headers(source),source)
if __name__=='__main__':unittest.main()
