# Compressed URL Feature Test Results

1. URL now uses hash fragment with compressed data: `#d=eJytlk1z2jAQhu_8ih...` (confirmed)
2. The sample data (115 lines of JSON) compressed into a much shorter hash fragment
3. Share URL button visible and working
4. Flame graph rendered correctly from the compressed URL data
5. Need to test: loading from a compressed hash URL directly
6. The URL hash is much shorter than the old base64 query param approach

## URL from the test:
https://3000-.../#d=eJytlk1z2jAQhu_8ih1OpJMx3_ngRoE07ZDEwW576HBQ7U2twcjEktOQDP-9wuHDQrbxmF4YayX8Pt7dV9J7BaDKyByrPaje2rYJX0Y21MmC1l3Cvd8BCd3q-XoRFyQUNo1XNuIIMncz7hjdOOJ41HdDZDL0S44B3uPfhEQ_Eh4yQR0iaMDgjrquj39JiLFIvFQTiqN7sYbR3kU1waSoIvztpw12MEMGP4hP3Vh-p5mtq2k3u7uZ1Xm-pInhnHK-_s6Bh84sR06-NlOxvRfcPE0rCXktxTcoHA-G2-rJJ0EyspvIZLKY-yjhS-bImAgjLJH0xwjDJXznGIIZBk_UR6gNP5_lJaKdkYem0VRmUiEOQRSYQcAYOnHbmUHgQ995jmii8YoAacXpKJOr82Io1uMYRq_oRAJ7YI3Go4ENn-Bm8nAHkUwWP8bUyWW67paCmiCPfAFDlARUeuRN90gKynU3h0UWTUVJjKaFffTR0H1G_KXcODjURq8CQzmEvvm1VDO1jdaJzRRvleaDZQPZchkyby_UwfrzuutPaauWcaXNZiKmYSqow3sLZG0DP0qtZxG2Az7ZgF1txUr_Uy6WPbbgljCXe2SmmzCFqqN1moZ1eTLVBGX1uKjLhC0CxguBXR7hkuXUuQ4iU9UnBS1rkpBjwhmZ1ApxWnsp3vgPnh0HxIX7QNCnzVEvbTtBl_JSfm2oxCX8GmvHdxuWhOqtt9tes9U-7RS4KFW9_U6LSqpgTLk4BnSRC3RVpISFbhPblgIr9VRQqDoZ94nNbpElMQjmixA_Lkq1P290cZb1-v0WoF4-K9vvmVZW_wADDmgU

This is significantly shorter than the old base64 approach and can handle much larger payloads.
